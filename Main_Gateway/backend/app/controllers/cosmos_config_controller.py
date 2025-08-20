"""
Cosmos DB Configuration Controller
Handles user configuration storage in Cosmos DB using managed identity
"""

from fastapi import APIRouter, HTTPException, Depends
from azure.identity import DefaultAzureCredential
from azure.cosmos import CosmosClient, exceptions
from typing import Optional, Dict, Any
import os
from datetime import datetime
from app.auth.azure_auth import validate_token
from app.util.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(
    prefix="/api/cosmos",
    tags=["cosmos-config"],
    responses={404: {"description": "Not found"}},
)

# Cosmos DB configuration
COSMOS_ENDPOINT = os.getenv(
    "COSMOS_ENDPOINT", "https://cosmos-research-analytics-prod.documents.azure.com:443/"
)
DATABASE_ID = os.getenv("COSMOS_DATABASE", "gzc-intel-app-config")
CONTAINER_ID = os.getenv("COSMOS_CONTAINER", "user-configurations")

# Initialize Cosmos client with managed identity - delayed initialization
container = None
cosmos_client = None


def determine_device_type(
    screen_width: int, screen_height: int, user_agent: str
) -> str:
    """
    Determine device type based on screen dimensions and user agent
    Returns: 'mobile', 'laptop', or 'desktop'
    """
    # Mobile detection
    mobile_keywords = [
        "Mobile",
        "Android",
        "iPhone",
        "iPad",
        "iPod",
        "BlackBerry",
        "Windows Phone",
    ]
    is_mobile_ua = any(keyword in user_agent for keyword in mobile_keywords)

    # Screen size thresholds
    if screen_width <= 768 or is_mobile_ua:
        return "mobile"
    elif screen_width <= 1366:  # Typical laptop resolution
        return "laptop"
    else:  # Large screens, external monitors
        return "desktop"


def get_device_specific_config(device_type: str, base_config: dict) -> dict:
    """
    Generate device-specific configuration based on device type
    """
    if device_type == "mobile":
        return {
            **base_config,
            # Mobile-optimized configuration
            "tabs": [
                {
                    "id": "main",
                    "name": "Dashboard",
                    "component": "Analytics",
                    "type": "dynamic",
                    "icon": "smartphone",
                    "closable": False,
                    "gridLayoutEnabled": True,
                    "components": [],
                    "editMode": False,
                    "position": 0,
                }
            ],
            "preferences": {
                **base_config.get("preferences", {}),
                "accessibility": {
                    "highContrast": False,
                    "fontSize": "large",  # Larger font for mobile
                    "animations": False,  # Reduce animations for performance
                },
                "performance": {
                    "enableLazyLoading": True,
                    "maxComponentsPerTab": 5,  # Fewer components for mobile
                },
            },
            "windowState": {
                "dimensions": {"width": 375, "height": 667},  # iPhone-like dimensions
                "position": {"x": 0, "y": 0},
                "maximized": True,  # Always maximized on mobile
                "fullscreen": False,
            },
        }

    elif device_type == "laptop":
        return {
            **base_config,
            # Laptop-optimized configuration
            "tabs": [
                {
                    "id": "main",
                    "name": "Analytics",
                    "component": "Analytics",
                    "type": "dynamic",
                    "icon": "laptop",
                    "closable": False,
                    "gridLayoutEnabled": True,
                    "components": [],
                    "editMode": False,
                    "position": 0,
                },
                {
                    "id": "portfolio",
                    "name": "Portfolio",
                    "component": "Portfolio",
                    "type": "dynamic",
                    "icon": "briefcase",
                    "closable": True,
                    "gridLayoutEnabled": True,
                    "components": [],
                    "editMode": False,
                    "position": 1,
                },
            ],
            "preferences": {
                **base_config.get("preferences", {}),
                "accessibility": {
                    "highContrast": False,
                    "fontSize": "medium",
                    "animations": True,
                },
                "performance": {
                    "enableLazyLoading": True,
                    "maxComponentsPerTab": 12,  # Moderate number for laptop
                },
            },
            "windowState": {
                "dimensions": {
                    "width": 1366,
                    "height": 768,
                },  # Typical laptop resolution
                "position": {"x": 0, "y": 0},
                "maximized": False,
                "fullscreen": False,
            },
        }

    else:  # desktop
        return {
            **base_config,
            # Desktop-optimized configuration (big screen)
            "tabs": [
                {
                    "id": "main",
                    "name": "Analytics Hub",
                    "component": "Analytics",
                    "type": "dynamic",
                    "icon": "monitor",
                    "closable": False,
                    "gridLayoutEnabled": True,
                    "components": [],
                    "editMode": False,
                    "position": 0,
                },
                {
                    "id": "portfolio",
                    "name": "Portfolio",
                    "component": "Portfolio",
                    "type": "dynamic",
                    "icon": "briefcase",
                    "closable": True,
                    "gridLayoutEnabled": True,
                    "components": [],
                    "editMode": False,
                    "position": 1,
                },
                {
                    "id": "trading",
                    "name": "Trading",
                    "component": "Trading",
                    "type": "dynamic",
                    "icon": "trending-up",
                    "closable": True,
                    "gridLayoutEnabled": True,
                    "components": [],
                    "editMode": False,
                    "position": 2,
                },
            ],
            "preferences": {
                **base_config.get("preferences", {}),
                "accessibility": {
                    "highContrast": False,
                    "fontSize": "medium",
                    "animations": True,
                },
                "performance": {
                    "enableLazyLoading": False,  # No lazy loading on powerful desktop
                    "maxComponentsPerTab": 25,  # More components for large screen
                },
            },
            "windowState": {
                "dimensions": {"width": 1920, "height": 1080},  # Full HD or larger
                "position": {"x": 0, "y": 0},
                "maximized": False,
                "fullscreen": False,
            },
        }


def get_cosmos_container():
    """Get or initialize Cosmos DB container with managed identity (fallback to key)"""
    global container, cosmos_client

    # Always initialize container to None to prevent undefined errors
    if container is None:
        container = None  # Explicit initialization
    elif container is not None:
        return container

    # Try key-based authentication first (more reliable in production)
    cosmos_key = os.getenv("COSMOS_KEY")
    if cosmos_key:
        try:
            logger.info("Attempting Cosmos DB connection with key authentication")
            cosmos_client = CosmosClient(COSMOS_ENDPOINT, credential=cosmos_key)
            database = cosmos_client.get_database_client(DATABASE_ID)
            container = database.get_container_client(CONTAINER_ID)

            # Verify connection by reading database properties
            database.read()
            logger.info(
                f"✅ Cosmos DB connected using key authentication for {COSMOS_ENDPOINT}"
            )
            return container
        except Exception as key_error:
            logger.warning(f"Key-based authentication failed: {str(key_error)[:200]}")
    else:
        logger.info("No COSMOS_KEY found - trying managed identity")

    # Fallback to managed identity
    try:
        logger.info(
            f"Attempting to connect to Cosmos DB at {COSMOS_ENDPOINT} using Managed Identity"
        )
        credential = DefaultAzureCredential()
        cosmos_client = CosmosClient(COSMOS_ENDPOINT, credential=credential)
        database = cosmos_client.get_database_client(DATABASE_ID)
        container = database.get_container_client(CONTAINER_ID)

        # Verify connection by reading database properties
        database.read()
        logger.info(
            f"✅ Cosmos DB connected using Managed Identity for {COSMOS_ENDPOINT}"
        )
        return container
    except Exception as managed_identity_error:
        logger.warning(f"Managed Identity failed: {str(managed_identity_error)[:200]}")

        # Both methods failed
        logger.error(f"❌ Cosmos DB initialization failed completely")
        logger.info(
            "ℹ️ Ensure: 1) COSMOS_KEY is set, 2) Managed Identity has Cosmos DB access, or 3) Container App uses NAT Gateway IP"
        )
        container = None
        return None


@router.get("/config")
async def get_user_config(
    payload: Dict = Depends(validate_token),
    device_info: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Get user configuration from Cosmos DB
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(
            status_code=503,
            detail="Cosmos DB not available - check NAT Gateway IP whitelisting",
        )

    try:
        # FIXED: Use consistent user identification across all browsers
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_oid = payload.get(
            "oid", ""
        )  # Azure AD Object ID - consistent across browsers
        user_sub = payload.get("sub", "")

        # Priority: email > oid > sub (email is most consistent for sync)
        if user_email:
            user_id = user_email.lower()  # Normalize email case
        elif user_oid:
            user_id = f"oid_{user_oid}"
        else:
            user_id = f"sub_{user_sub}" if user_sub else "unknown_user"

        logger.info(
            f"Loading configuration for user {user_id} (email: {user_email}, oid: {user_oid[:8]}...)"
        )

        # Try to read the document
        item = container.read_item(item=user_id, partition_key=user_id)
        return item

    except exceptions.CosmosResourceNotFoundError:
        logger.info(
            f"No configuration found for user {user_id}, returning device-specific default"
        )

        # Get device info from request headers or payload
        device_info = payload.get("deviceInfo", {})
        screen_width = device_info.get("screenWidth", 1920)
        screen_height = device_info.get("screenHeight", 1080)
        user_agent = device_info.get("userAgent", "")

        # Determine device type based on screen size and user agent
        device_type = determine_device_type(screen_width, screen_height, user_agent)
        logger.info(
            f"Creating {device_type} default config for user {user_id} (screen: {screen_width}x{screen_height})"
        )

        # Create base configuration structure
        now = datetime.utcnow().isoformat()
        base_config = {
            "id": user_id,
            "userId": user_id,
            "name": f"Default {device_type.title()} Config for {user_id}",
            "type": "user-config",
            "version": "1.0.0",
            "deviceType": device_type,
            "targetScreenSize": {"width": screen_width, "height": screen_height},
            "layouts": [],
            "currentLayoutId": "default",
            "activeTabId": "main",
            # Base preferences that will be overridden by device-specific config
            "preferences": {
                "theme": "gzc-dark",
                "language": "en",
                "autoSave": True,
                "syncAcrossDevices": True,
                "notifications": {
                    "enabled": True,
                    "types": ["system", "component-updates"],
                },
                "accessibility": {
                    "highContrast": False,
                    "fontSize": "medium",
                    "animations": True,
                },
                "performance": {"enableLazyLoading": True, "maxComponentsPerTab": 20},
            },
            # State management
            "componentStates": [],
            "windowState": {
                "dimensions": {"width": screen_width, "height": screen_height},
                "position": {"x": 0, "y": 0},
                "maximized": False,
                "fullscreen": False,
            },
            # Session and memory
            "currentSession": {
                "sessionId": f"session-{int(datetime.utcnow().timestamp() * 1000)}",
                "deviceInfo": {
                    "userAgent": user_agent,
                    "platform": device_info.get("platform", ""),
                    "screenResolution": f"{screen_width}x{screen_height}",
                    "timezone": device_info.get("timezone", "UTC"),
                },
                "loginTime": now,
                "lastActivity": now,
                "activeTabIds": ["main"],
                "openLayouts": ["default"],
            },
            "userMemory": [],
            # Metadata
            "createdAt": now,
            "updatedAt": now,
            "lastSyncAt": now,
            "deviceId": device_info.get("deviceId"),
            "previousVersions": [],
            # Feature flags
            "featureFlags": {
                "experimentalComponents": False,
                "advancedGridLayout": True,
                "cloudSync": True,
            },
            # Legacy compatibility
            "userEmail": payload.get("preferred_username", ""),
            "timestamp": now,
            "isDefault": True,
        }

        # Generate device-specific configuration
        device_config = get_device_specific_config(device_type, base_config)
        return device_config
    except Exception as e:
        logger.error(f"Error reading configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to load configuration")


@router.post("/config/device")
async def get_device_config(
    device_request: Dict[str, Any], payload: Dict = Depends(validate_token)
) -> Optional[Dict[str, Any]]:
    """
    Get device-specific configuration based on screen size and device info
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(
            status_code=503,
            detail="Cosmos DB not available - check NAT Gateway IP whitelisting",
        )

    try:
        # Get consistent user ID
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_oid = payload.get("oid", "")
        user_sub = payload.get("sub", "")

        if user_email:
            user_id = user_email.lower()
        elif user_oid:
            user_id = f"oid_{user_oid}"
        else:
            user_id = f"sub_{user_sub}" if user_sub else "unknown_user"

        # Extract device information
        screen_width = device_request.get("screenWidth", 1920)
        screen_height = device_request.get("screenHeight", 1080)
        user_agent = device_request.get("userAgent", "")
        device_type = determine_device_type(screen_width, screen_height, user_agent)

        logger.info(
            f"Device config request for user {user_id}: {device_type} ({screen_width}x{screen_height})"
        )

        # Try to get existing configuration
        try:
            existing_config = container.read_item(item=user_id, partition_key=user_id)

            # Check if existing config matches current device type
            if existing_config.get("deviceType") == device_type:
                logger.info(
                    f"Returning existing {device_type} config for user {user_id}"
                )
                return existing_config
            else:
                logger.info(
                    f"Device type changed from {existing_config.get('deviceType', 'unknown')} to {device_type}"
                )

        except exceptions.CosmosResourceNotFoundError:
            logger.info(f"No existing config found for user {user_id}")

        # Create new device-specific configuration
        now = datetime.utcnow().isoformat()
        base_config = {
            "id": user_id,
            "userId": user_id,
            "name": f"Auto {device_type.title()} Config for {user_id}",
            "type": "user-config",
            "version": "1.0.0",
            "deviceType": device_type,
            "targetScreenSize": {"width": screen_width, "height": screen_height},
            "layouts": [],
            "currentLayoutId": "default",
            "activeTabId": "main",
            "preferences": {
                "theme": "gzc-dark",
                "language": "en",
                "autoSave": True,
                "syncAcrossDevices": True,
                "notifications": {
                    "enabled": True,
                    "types": ["system", "component-updates"],
                },
                "accessibility": {
                    "highContrast": False,
                    "fontSize": "medium",
                    "animations": True,
                },
                "performance": {"enableLazyLoading": True, "maxComponentsPerTab": 20},
            },
            "componentStates": [],
            "windowState": {
                "dimensions": {"width": screen_width, "height": screen_height},
                "position": {"x": 0, "y": 0},
                "maximized": False,
                "fullscreen": False,
            },
            "currentSession": {
                "sessionId": f"session-{int(datetime.utcnow().timestamp() * 1000)}",
                "deviceInfo": {
                    "userAgent": user_agent,
                    "platform": device_request.get("platform", ""),
                    "screenResolution": f"{screen_width}x{screen_height}",
                    "timezone": device_request.get("timezone", "UTC"),
                },
                "loginTime": now,
                "lastActivity": now,
                "activeTabIds": ["main"],
                "openLayouts": ["default"],
            },
            "userMemory": [],
            "createdAt": now,
            "updatedAt": now,
            "lastSyncAt": now,
            "deviceId": device_request.get("deviceId"),
            "previousVersions": [],
            "featureFlags": {
                "experimentalComponents": False,
                "advancedGridLayout": True,
                "cloudSync": True,
            },
            "userEmail": user_email,
            "timestamp": now,
            "autoGenerated": True,
        }

        # Generate device-specific configuration
        device_config = get_device_specific_config(device_type, base_config)

        # Save the new configuration
        saved_config = container.upsert_item(body=device_config)
        logger.info(f"Created and saved new {device_type} config for user {user_id}")

        return saved_config

    except Exception as e:
        logger.error(f"Error getting device config: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to get device configuration"
        )


@router.post("/config")
async def save_user_config(
    config: Dict[str, Any], payload: Dict = Depends(validate_token)
) -> Dict[str, Any]:
    """
    Save user configuration to Cosmos DB
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(
            status_code=503,
            detail="Cosmos DB not available - check NAT Gateway IP whitelisting",
        )

    try:
        # FIXED: Use consistent user identification across all browsers
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_oid = payload.get(
            "oid", ""
        )  # Azure AD Object ID - consistent across browsers
        user_sub = payload.get("sub", "")

        # Priority: email > oid > sub (email is most consistent for sync)
        if user_email:
            user_id = user_email.lower()  # Normalize email case
        elif user_oid:
            user_id = f"oid_{user_oid}"
        else:
            user_id = f"sub_{user_sub}" if user_sub else "unknown_user"

        logger.info(
            f"Saving configuration for user {user_id} (email: {user_email}, oid: {user_oid[:8]}...)"
        )

        # Deduplicate tabs before saving
        tabs = config.get("tabs", [])
        seen_tab_ids = set()
        unique_tabs = []
        for tab in tabs:
            if tab.get("id") not in seen_tab_ids:
                seen_tab_ids.add(tab.get("id"))
                unique_tabs.append(tab)
            else:
                logger.warning(
                    f"Removing duplicate tab {tab.get('id')} for user {user_id}"
                )

        # Prepare comprehensive document
        now = datetime.utcnow().isoformat()

        # Get existing document for versioning
        existing_doc = None
        try:
            existing_doc = container.read_item(item=user_id, partition_key=user_id)
        except exceptions.CosmosResourceNotFoundError:
            pass

        # FIXED: Limit version history to prevent bloat (keep only last 2 versions)
        previous_versions = []
        if existing_doc:
            # Only keep last 1 version to prevent config bloat
            previous_versions = existing_doc.get("previousVersions", [])[-1:]

            # Only save minimal data - exclude large tab arrays
            current_tab_count = len(existing_doc.get("tabs", []))
            if current_tab_count > 0:  # Only save if there are meaningful changes
                previous_versions.append(
                    {
                        "version": existing_doc.get("version", "1.0.0"),
                        "data": {
                            "tabCount": current_tab_count,  # Just count, not full data
                            "preferences": existing_doc.get("preferences", {}),
                            "activeTabId": existing_doc.get("activeTabId"),
                            "lastActivity": existing_doc.get("updatedAt", now),
                        },
                        "timestamp": existing_doc.get("updatedAt", now),
                    }
                )

        document = {
            "id": user_id,
            "userId": user_id,
            "name": f"Config for {user_id}",  # ADDED: Human-readable config name
            "type": "user-config",
            "version": config.get("version", "1.0.0"),
            # Core configuration
            "tabs": unique_tabs,
            "layouts": config.get("layouts", []),
            "currentLayoutId": config.get("currentLayoutId", "default"),
            "activeTabId": config.get(
                "activeTabId", unique_tabs[0]["id"] if unique_tabs else "main"
            ),
            # User preferences
            "preferences": config.get("preferences", {}),
            # State management
            "componentStates": config.get("componentStates", []),
            "windowState": config.get(
                "windowState",
                {
                    "dimensions": {"width": 1920, "height": 1080},
                    "position": {"x": 0, "y": 0},
                    "maximized": False,
                    "fullscreen": False,
                },
            ),
            # ENHANCED: Session tracking with device info for better sync
            "currentSession": {
                **config.get("currentSession", {}),
                "lastActivity": now,
                "sessionId": config.get("currentSession", {}).get(
                    "sessionId", f"session-{int(datetime.utcnow().timestamp() * 1000)}"
                ),
                "deviceInfo": {
                    **config.get("currentSession", {}).get("deviceInfo", {}),
                    "lastSyncBrowser": config.get("currentSession", {})
                    .get("deviceInfo", {})
                    .get("userAgent", "Unknown"),
                    "lastSyncTime": now,
                },
            },
            "userMemory": config.get("userMemory", []),
            # Metadata
            "createdAt": existing_doc.get("createdAt", now) if existing_doc else now,
            "updatedAt": now,
            "lastSyncAt": now,
            "deviceId": config.get("deviceId"),
            "previousVersions": previous_versions,
            # Feature flags
            "featureFlags": config.get(
                "featureFlags",
                {
                    "experimentalComponents": False,
                    "advancedGridLayout": True,
                    "cloudSync": True,
                },
            ),
            # Legacy compatibility
            "userEmail": user_email,
            "timestamp": now,
            "componentStates": config.get(
                "componentStates", {}
            ),  # Backward compatibility
            "sessionData": config.get("sessionData", {}),  # Backward compatibility
        }

        # Upsert the document
        item = container.upsert_item(body=document)
        logger.info(f"Configuration '{document['name']}' saved for user {user_id}")
        return item

    except Exception as e:
        logger.error(f"Error saving configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to save configuration")


@router.post("/user-memory")
async def save_user_memory(
    memory_data: Dict[str, Any], payload: Dict = Depends(validate_token)
) -> Dict[str, Any]:
    """
    Save user memory data to Cosmos DB (replaces PostgreSQL)
    Compatible with frontend UserMemoryStore
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(
            status_code=503,
            detail="Cosmos DB not available - check NAT Gateway IP whitelisting",
        )

    try:
        # FIXED: Use consistent user identification across all browsers
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_oid = payload.get("oid", "")
        user_sub = payload.get("sub", "")

        if user_email:
            user_id = user_email.lower()
        elif user_oid:
            user_id = f"oid_{user_oid}"
        else:
            user_id = f"sub_{user_sub}" if user_sub else "unknown_user"

        # Extract memory details from request
        memory_type = memory_data.get("memoryType", "config")
        memory_key = memory_data.get("memoryKey", "default")
        memory_content = memory_data.get("memoryData", {})

        # Document ID for Cosmos DB (composite key)
        doc_id = f"{user_id}_{memory_type}_{memory_key}"

        document = {
            "id": doc_id,
            "userId": user_id,
            "userEmail": user_email,
            "memoryType": memory_type,
            "memoryKey": memory_key,
            "memoryData": memory_content,
            "timestamp": datetime.utcnow().isoformat(),
            "version": memory_data.get("version", 1),
            "type": "user-memory",
        }

        # Upsert the document
        item = container.upsert_item(body=document)
        logger.info(f"Memory saved for {user_id}/{memory_type}/{memory_key}")

        return {
            "success": True,
            "memoryData": memory_content,
            "version": item.get("version", 1),
            "updatedAt": item.get("timestamp"),
        }

    except Exception as e:
        logger.error(f"Error saving user memory: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save memory: {str(e)}")


@router.get("/user-memory")
async def load_user_memory(
    memoryType: str, memoryKey: str, payload: Dict = Depends(validate_token)
) -> Dict[str, Any]:
    """
    Load user memory data from Cosmos DB
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available")

    try:
        # FIXED: Use consistent user identification across all browsers
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_oid = payload.get("oid", "")
        user_sub = payload.get("sub", "")

        if user_email:
            user_id = user_email.lower()
        elif user_oid:
            user_id = f"oid_{user_oid}"
        else:
            user_id = f"sub_{user_sub}" if user_sub else "unknown_user"

        # Document ID for Cosmos DB
        doc_id = f"{user_id}_{memoryType}_{memoryKey}"

        # Try to read the document
        item = container.read_item(item=doc_id, partition_key=doc_id)

        return {
            "memoryData": item.get("memoryData", {}),
            "version": item.get("version", 1),
            "updatedAt": item.get("timestamp"),
        }

    except exceptions.CosmosResourceNotFoundError:
        logger.info(f"No memory found for {user_id}/{memoryType}/{memoryKey}")
        return {
            "memoryData": {},
            "version": 0,
            "updatedAt": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Error loading user memory: {e}")
        raise HTTPException(status_code=500, detail="Failed to load memory")


@router.put("/config")
async def update_user_config(
    updates: Dict[str, Any], payload: Dict = Depends(validate_token)
) -> Dict[str, Any]:
    """
    Update specific fields in user configuration
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available")

    try:
        # FIXED: Use consistent user identification across all browsers
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_oid = payload.get("oid", "")
        user_sub = payload.get("sub", "")

        if user_email:
            user_id = user_email.lower()
        elif user_oid:
            user_id = f"oid_{user_oid}"
        else:
            user_id = f"sub_{user_sub}" if user_sub else "unknown_user"

        logger.info(
            f"Updating configuration for user {user_id} (email: {user_email}, oid: {user_oid[:8]}...)"
        )

        # Get existing document
        try:
            existing = container.read_item(item=user_id, partition_key=user_id)
        except exceptions.CosmosResourceNotFoundError:
            existing = {
                "id": user_id,
                "userId": user_id,
                "name": f"Config for {user_id}",  # ADDED: Human-readable config name
                "userEmail": user_email,
                "type": "user-config",
            }

        # Merge updates with enhanced memory fields
        if "tabs" in updates:
            existing["tabs"] = updates["tabs"]
        if "layouts" in updates:
            existing["layouts"] = updates["layouts"]
        if "preferences" in updates:
            existing["preferences"] = updates["preferences"]
        if "componentStates" in updates:
            existing["componentStates"] = updates["componentStates"]
        if "sessionData" in updates:
            existing["sessionData"] = updates["sessionData"]
        if "version" in updates:
            existing["version"] = updates["version"]

        existing["timestamp"] = datetime.utcnow().isoformat()

        # Save back
        item = container.upsert_item(body=existing)
        logger.info(f"Configuration updated for user {user_id}")
        return item

    except Exception as e:
        logger.error(f"Error updating configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to update configuration")


@router.delete("/config")
async def delete_user_config(payload: Dict = Depends(validate_token)) -> Dict[str, str]:
    """
    Delete user configuration from Cosmos DB
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available")

    try:
        # FIXED: Use consistent user identification across all browsers
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_oid = payload.get("oid", "")
        user_sub = payload.get("sub", "")

        if user_email:
            user_id = user_email.lower()
        elif user_oid:
            user_id = f"oid_{user_oid}"
        else:
            user_id = f"sub_{user_sub}" if user_sub else "unknown_user"

        logger.info(
            f"Deleting configuration for user {user_id} (email: {user_email}, oid: {user_oid[:8]}...)"
        )

        container.delete_item(item=user_id, partition_key=user_id)
        logger.info(f"Configuration deleted for user {user_id}")
        return {"message": "Configuration deleted successfully"}

    except exceptions.CosmosResourceNotFoundError:
        return {"message": "No configuration to delete"}
    except Exception as e:
        logger.error(f"Error deleting configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete configuration")


@router.post("/cleanup")
async def cleanup_user_config(
    payload: Dict = Depends(validate_token),
) -> Dict[str, Any]:
    """
    Clean up stale data and excessive version history for user
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available")

    try:
        # Get consistent user ID
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_oid = payload.get("oid", "")
        user_sub = payload.get("sub", "")

        if user_email:
            user_id = user_email.lower()
        elif user_oid:
            user_id = f"oid_{user_oid}"
        else:
            user_id = f"sub_{user_sub}" if user_sub else "unknown_user"

        logger.info(f"Cleaning up configuration for user {user_id}")

        # Get existing document
        try:
            existing = container.read_item(item=user_id, partition_key=user_id)
        except exceptions.CosmosResourceNotFoundError:
            return {"message": "No configuration to clean up"}

        # Clean up data
        cleaned_config = {
            **existing,
            "name": f"Cleaned Config for {user_id}",  # Update name to show it was cleaned
            "previousVersions": [],  # Remove ALL version history
            "updatedAt": datetime.utcnow().isoformat(),
            "lastCleanup": datetime.utcnow().isoformat(),
        }

        # Save cleaned config
        item = container.upsert_item(body=cleaned_config)
        logger.info(
            f"Configuration '{cleaned_config['name']}' cleaned for user {user_id}"
        )

        return {
            "message": f"Configuration '{cleaned_config['name']}' cleaned successfully",
            "configName": cleaned_config["name"],
            "userId": user_id,
            "removedVersions": len(existing.get("previousVersions", [])),
            "newSize": len(str(cleaned_config)),
        }

    except Exception as e:
        logger.error(f"Error cleaning configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to clean configuration")


@router.get("/health")
async def cosmos_health_check() -> Dict[str, Any]:
    """
    Check Cosmos DB connectivity
    """
    try:
        container = get_cosmos_container()
        if not container:
            return {"status": "error", "message": "Cosmos DB client not initialized"}

        # Try to query the container
        query = "SELECT VALUE COUNT(1) FROM c"
        items = list(
            container.query_items(query=query, enable_cross_partition_query=True)
        )

        return {
            "status": "healthy",
            "endpoint": COSMOS_ENDPOINT,
            "database": DATABASE_ID,
            "container": CONTAINER_ID,
            "document_count": items[0] if items else 0,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
