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
    Returns: 'mobile', 'laptop', or 'bigscreen'

    Enhanced detection logic matching frontend implementation
    """
    # Enhanced mobile detection with more sophisticated logic
    mobile_keywords = [
        "Mobile",
        "Android",
        "iPhone",
        "iPad",
        "iPod",
        "BlackBerry",
        "Windows Phone",
        "Mobile Safari",
    ]

    # Check if it's actually a mobile device
    is_mobile_ua = any(keyword in user_agent for keyword in mobile_keywords)

    # Enhanced detection logic - more sophisticated than simple width check
    # Only classify as mobile if both small screen AND mobile indicators are present
    is_small_screen = screen_width <= 768

    # Enhanced mobile detection logic
    if is_small_screen and is_mobile_ua:
        # Mobile: small screen AND mobile user agent
        device_type = "mobile"
    elif screen_width <= 1366:
        # Laptop: medium screen size
        device_type = "laptop"
    else:
        # Bigscreen: large screens, external monitors
        device_type = "bigscreen"

    # Log device detection details for debugging
    logger.info(
        f"Device detection: {screen_width}x{screen_height}, "
        f"UA: {user_agent[:50]}..., "
        f"Mobile UA: {is_mobile_ua}, "
        f"Small screen: {is_small_screen}, "
        f"Result: {device_type}"
    )

    return device_type


async def get_device_specific_config(
    device_type: str, base_config: dict, user_id: str
) -> dict:
    """
    Get user-specific device configuration from Cosmos DB
    Returns empty template if not found
    """
    container = get_cosmos_container()
    if not container:
        logger.warning("Cosmos DB not available, returning empty device config")
        return get_empty_device_config(device_type, base_config, user_id)

    try:
        # User-specific device config ID format: "{device_type}_{user_id}"
        device_config_id = f"{device_type}_{user_id}"

        logger.info(f"Looking for user device config: {device_config_id}")

        # Try to read user-specific device configuration
        device_config_doc = container.read_item(
            item=device_config_id, partition_key=device_config_id
        )

        logger.info(
            f"Found existing {device_type} device configuration for user {user_id}"
        )

        # Merge with base config
        merged_config = {
            **base_config,
            **device_config_doc.get("config", {}),
            "deviceType": device_type,
            "userId": user_id,
        }

        return merged_config

    except exceptions.CosmosResourceNotFoundError:
        logger.info(
            f"No device configuration found for {device_type}_{user_id}, returning empty template"
        )
        return get_empty_device_config(device_type, base_config, user_id)
    except Exception as e:
        logger.error(f"Error loading device config for {device_type}_{user_id}: {e}")
        return get_empty_device_config(device_type, base_config, user_id)


def get_empty_device_config(device_type: str, base_config: dict, user_id: str) -> dict:
    """
    Return empty device configuration template for specific user
    """
    return {
        **base_config,
        "deviceType": device_type,
        "userId": user_id,
        "tabs": [],  # Empty - user will create their own
        "preferences": base_config.get("preferences", {}),
        "windowState": base_config.get("windowState", {}),
        "isEmpty": True,  # Flag to indicate this is an empty template
        "message": f"No {device_type} configuration found for {user_id}. Create your custom {device_type} layout.",
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

    # COMMENTED OUT - USE DEVICE-SPECIFIC ENDPOINTS ONLY
    # @router.get("/config")
    # async def get_user_config(
    #     payload: Dict = Depends(validate_token),
    #     device_info: Optional[Dict[str, Any]] = None,
    # ) -> Optional[Dict[str, Any]]:
    #     """
    #     Get user configuration from Cosmos DB
    #     """
    #     container = get_cosmos_container()
    #     if not container:
    #         raise HTTPException(
    #             status_code=503,
    #             detail="Cosmos DB not available - check NAT Gateway IP whitelisting",
    #         )
    #
    #     try:
    #         # FIXED: Use consistent user identification across all browsers
    #         user_email = payload.get("preferred_username") or payload.get("email", "")
    #         user_oid = payload.get(
    #             "oid", ""
    #         )  # Azure AD Object ID - consistent across browsers
    #         user_sub = payload.get("sub", "")
    #
    #         # Priority: email > oid > sub (email is most consistent for sync)
    #         if user_email:
    #             user_id = user_email.lower()  # Normalize email case
    #         elif user_oid:
    #             user_id = f"oid_{user_oid}"
    #         else:
    #             user_id = f"sub_{user_sub}" if user_sub else "unknown_user"
    #
    #         logger.info(
    #             f"Loading configuration for user {user_id} (email: {user_email}, oid: {user_oid[:8]}...)"
    #         )
    #
    #         # Try to read the document
    #         item = container.read_item(item=user_id, partition_key=user_id)
    #         return item
    #
    #     except exceptions.CosmosResourceNotFoundError:
    #         logger.info(
    #             f"No configuration found for user {user_id}, returning device-specific default"
    #         )
    #
    #         # Get device info from request headers or payload
    #         device_info = payload.get("deviceInfo", {}) or {}
    #         screen_width = device_info.get("screenWidth", 1920)
    #         screen_height = device_info.get("screenHeight", 1080)
    #         user_agent = device_info.get("userAgent", "")
    #
    #         # Determine device type based on screen size and user agent
    #         device_type = determine_device_type(screen_width, screen_height, user_agent)
    #         logger.info(
    #             f"Creating {device_type} default config for user {user_id} (screen: {screen_width}x{screen_height})"
    #         )
    #
    #         # Create base configuration structure
    #         now = datetime.utcnow().isoformat()
    #         base_config = {
    #             "id": user_id,
    #             "userId": user_id,
    #             "name": f"Default {device_type.title()} Config for {user_id}",
    #             "type": "user-config",
    #             "version": "1.0.0",
    #             "deviceType": device_type,
    #             "targetScreenSize": {"width": screen_width, "height": screen_height},
    #             "layouts": [],
    #             "currentLayoutId": "default",
    #             "activeTabId": "main",
    #             # Base preferences that will be overridden by device-specific config
    #             "preferences": {
    #                 "theme": "gzc-dark",
    #                 "language": "en",
    #                 "autoSave": True,
    #                 "syncAcrossDevices": True,
    #                 "notifications": {
    #                     "enabled": True,
    #                     "types": ["system", "component-updates"],
    #                 },
    #                 "accessibility": {
    #                     "highContrast": False,
    #                     "fontSize": "medium",
    #                     "animations": True,
    #                 },
    #                 "performance": {"enableLazyLoading": True, "maxComponentsPerTab": 20},
    #             },
    #             # State management
    #             "componentStates": [],
    #             "windowState": {
    #                 "dimensions": {"width": screen_width, "height": screen_height},
    #                 "position": {"x": 0, "y": 0},
    #                 "maximized": False,
    #                 "fullscreen": False,
    #             },
    #             # Session and memory
    #             "currentSession": {
    #                 "sessionId": f"session-{int(datetime.utcnow().timestamp() * 1000)}",
    #                 "deviceInfo": {
    #                     "userAgent": user_agent,
    #                     "platform": device_info.get("platform", ""),
    #                     "screenResolution": f"{screen_width}x{screen_height}",
    #                     "timezone": device_info.get("timezone", "UTC"),
    #                 },
    #                 "loginTime": now,
    #                 "lastActivity": now,
    #                 "activeTabIds": ["main"],
    #                 "openLayouts": ["default"],
    #             },
    #             "userMemory": [],
    #             # Metadata
    #             "createdAt": now,
    #             "updatedAt": now,
    #             "lastSyncAt": now,
    #             "deviceId": device_info.get("deviceId"),
    #             "previousVersions": [],
    #             # Feature flags
    #             "featureFlags": {
    #                 "experimentalComponents": False,
    #                 "advancedGridLayout": True,
    #                 "cloudSync": True,
    #             },
    #             # Legacy compatibility
    #             "userEmail": payload.get("preferred_username", ""),
    #             "timestamp": now,
    #             "isDefault": True,
    #         }
    #
    #         # Generate device-specific configuration
    #         device_config = await get_device_specific_config(
    #             device_type, base_config, user_id
    #         )
    #         return device_config
    #     except Exception as e:
    #         logger.error(f"Error reading configuration: {e}")
    #         raise HTTPException(status_code=500, detail="Failed to load configuration")


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
        existing_config = None
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
        device_config = await get_device_specific_config(
            device_type, base_config, user_id
        )

        # Save the new configuration
        saved_config = container.upsert_item(body=device_config)
        logger.info(f"Created and saved new {device_type} config for user {user_id}")

        return saved_config

    except Exception as e:
        logger.error(f"Error getting device config: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to get device configuration"
        )


# COMMENTED OUT - USE DEVICE-SPECIFIC ENDPOINTS ONLY
# @router.post("/config")
# async def save_user_config(
#     config: Dict[str, Any], payload: Dict = Depends(validate_token)
# ) -> Dict[str, Any]:
#     """
#     Save user configuration to Cosmos DB
#     """
#     container = get_cosmos_container()
#     if not container:
#         raise HTTPException(
#             status_code=503,
#             detail="Cosmos DB not available - check NAT Gateway IP whitelisting",
#         )
#
#     try:
#         # FIXED: Use consistent user identification across all browsers
#         user_email = payload.get("preferred_username") or payload.get("email", "")
#         user_oid = payload.get(
#             "oid", ""
#         )  # Azure AD Object ID - consistent across browsers
#         user_sub = payload.get("sub", "")
#
#         # Priority: email > oid > sub (email is most consistent for sync)
#         if user_email:
#             user_id = user_email.lower()  # Normalize email case
#         elif user_oid:
#             user_id = f"oid_{user_oid}"
#         else:
#             user_id = f"sub_{user_sub}" if user_sub else "unknown_user"
#
#         logger.info(
#             f"Saving configuration for user {user_id} (email: {user_email}, oid: {user_oid[:8]}...)"
#         )
#
#         # Deduplicate tabs before saving
#         tabs = config.get("tabs", [])
#         seen_tab_ids = set()
#         unique_tabs = []
#         for tab in tabs:
#             if tab.get("id") not in seen_tab_ids:
#                 seen_tab_ids.add(tab.get("id"))
#                 unique_tabs.append(tab)
#             else:
#                 logger.warning(
#                     f"Removing duplicate tab {tab.get('id')} for user {user_id}"
#                 )
#
#         # Prepare comprehensive document
#         now = datetime.utcnow().isoformat()
#
#         # Get existing document for versioning
#         existing_doc = None
#         try:
#             existing_doc = container.read_item(item=user_id, partition_key=user_id)
#         except exceptions.CosmosResourceNotFoundError:
#             pass
#
#         # FIXED: Limit version history to prevent bloat (keep only last 2 versions)
#         previous_versions = []
#         if existing_doc:
#             # Only keep last 1 version to prevent config bloat
#             previous_versions = existing_doc.get("previousVersions", [])[-1:]
#
#             # Only save minimal data - exclude large tab arrays
#             current_tab_count = len(existing_doc.get("tabs", []))
#             if current_tab_count > 0:  # Only save if there are meaningful changes
#                 previous_versions.append(
#                     {
#                         "version": existing_doc.get("version", "1.0.0"),
#                         "data": {
#                             "tabCount": current_tab_count,  # Just count, not full data
#                             "preferences": existing_doc.get("preferences", {}),
#                             "activeTabId": existing_doc.get("activeTabId"),
#                             "lastActivity": existing_doc.get("updatedAt", now),
#                         },
#                         "timestamp": existing_doc.get("updatedAt", now),
#                     }
#                 )
#
#         document = {
#             "id": user_id,
#             "userId": user_id,
#             "name": f"Config for {user_id}",  # ADDED: Human-readable config name
#             "type": "user-config",
#             "version": config.get("version", "1.0.0"),
#             # Core configuration
#             "tabs": unique_tabs,
#             "layouts": config.get("layouts", []),
#             "currentLayoutId": config.get("currentLayoutId", "default"),
#             "activeTabId": config.get(
#                 "activeTabId", unique_tabs[0]["id"] if unique_tabs else "main"
#             ),
#             # User preferences
#             "preferences": config.get("preferences", {}),
#             # State management
#             "componentStates": config.get("componentStates", []),
#             "windowState": config.get(
#                 "windowState",
#                 {
#                     "dimensions": {"width": 1920, "height": 1080},
#                     "position": {"x": 0, "y": 0},
#                     "maximized": False,
#                     "fullscreen": False,
#                 },
#             ),
#             # ENHANCED: Session tracking with device info for better sync
#             "currentSession": {
#                 **config.get("currentSession", {}),
#                 "lastActivity": now,
#                 "sessionId": config.get("currentSession", {}).get(
#                     "sessionId", f"session-{int(datetime.utcnow().timestamp() * 1000)}"
#                 ),
#                 "deviceInfo": {
#                     **config.get("currentSession", {}).get("deviceInfo", {}),
#                     "lastSyncBrowser": config.get("currentSession", {})
#                     .get("deviceInfo", {})
#                     .get("userAgent", "Unknown"),
#                     "lastSyncTime": now,
#                 },
#             },
#             "userMemory": config.get("userMemory", []),
#             # Metadata
#             "createdAt": existing_doc.get("createdAt", now) if existing_doc else now,
#             "updatedAt": now,
#             "lastSyncAt": now,
#             "deviceId": config.get("deviceId"),
#             "previousVersions": previous_versions,
#             # Feature flags
#             "featureFlags": config.get(
#                 "featureFlags",
#                 {
#                     "experimentalComponents": False,
#                     "advancedGridLayout": True,
#                     "cloudSync": True,
#                 },
#             ),
#             # Legacy compatibility
#             "userEmail": user_email,
#             "timestamp": now,
#             "componentStates": config.get(
#                 "componentStates", {}
#             ),  # Backward compatibility
#             "sessionData": config.get("sessionData", {}),  # Backward compatibility
#         }
#
#         # Upsert the document
#         item = container.upsert_item(body=document)
#         logger.info(f"Configuration '{document['name']}' saved for user {user_id}")
#         return item
#
#     except Exception as e:
#         logger.error(f"Error saving configuration: {e}")
#         raise HTTPException(status_code=500, detail="Failed to save configuration")


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

    # COMMENTED OUT - USE DEVICE-SPECIFIC ENDPOINTS ONLY
    # @router.put("/config")
    # async def update_user_config(
    #     updates: Dict[str, Any], payload: Dict = Depends(validate_token)
    # ) -> Dict[str, Any]:
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

    # COMMENTED OUT - USE DEVICE-SPECIFIC ENDPOINTS ONLY
    # @router.delete("/config")
    # async def delete_user_config(payload: Dict = Depends(validate_token)) -> Dict[str, str]:
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


@router.post("/migrate-user-id")
async def migrate_user_id(
    migration_request: Dict[str, Any], payload: Dict = Depends(validate_token)
) -> Dict[str, Any]:
    """
    Migrate user configuration from old ID to new email-based ID
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available")

    try:
        # Get current user email from token
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_oid = payload.get("oid", "")

        if not user_email:
            raise HTTPException(status_code=400, detail="No email found in token")

        new_user_id = user_email.lower()
        old_user_id = migration_request.get("oldUserId")

        if not old_user_id:
            raise HTTPException(status_code=400, detail="oldUserId required")

        logger.info(f"Migrating configuration: {old_user_id} → {new_user_id}")

        # Check if old config exists
        try:
            old_config = container.read_item(
                item=old_user_id, partition_key=old_user_id
            )
            logger.info(
                f"Found old configuration with {len(old_config.get('tabs', []))} tabs"
            )
        except exceptions.CosmosResourceNotFoundError:
            raise HTTPException(
                status_code=404, detail=f"No configuration found for {old_user_id}"
            )

        # Clean up the old configuration before migration
        cleaned_tabs = []
        valid_tab_names = set()

        for tab in old_config.get("tabs", []):
            # Skip duplicate "New Tab 1" entries
            if isinstance(tab, dict):
                tab_name = tab.get("title") or tab.get("name", "")

                # Only keep tabs with meaningful names or the last one of each type
                if tab_name and tab_name != "New Tab 1":
                    if tab_name not in valid_tab_names:
                        valid_tab_names.add(tab_name)
                        # Convert old format to new format
                        clean_tab = {
                            "id": tab.get("tab_id")
                            or tab.get("id", f"tab-{len(cleaned_tabs)}"),
                            "name": tab_name,
                            "component": "UserTabContainer",
                            "type": "dynamic",
                            "icon": tab.get("icon", "grid"),
                            "closable": True,
                            "gridLayoutEnabled": True,
                            "components": tab.get("component_ids", []),
                            "editMode": False,
                            "position": len(cleaned_tabs),
                        }
                        cleaned_tabs.append(clean_tab)

        # If no valid tabs found, create a default one
        if not cleaned_tabs:
            cleaned_tabs = [
                {
                    "id": "main",
                    "name": "Analytics",
                    "component": "Analytics",
                    "type": "dynamic",
                    "icon": "home",
                    "closable": False,
                    "gridLayoutEnabled": True,
                    "components": [],
                    "editMode": False,
                    "position": 0,
                }
            ]

        logger.info(
            f"Cleaned tabs: {len(old_config.get('tabs', []))} → {len(cleaned_tabs)}"
        )

        # Create new configuration with email-based ID
        now = datetime.utcnow().isoformat()

        # Determine device type based on window state or default to desktop
        window_state = old_config.get("windowState", {})
        screen_width = window_state.get("dimensions", {}).get("width", 1920)
        screen_height = window_state.get("dimensions", {}).get("height", 1080)
        device_type = determine_device_type(screen_width, screen_height, "")

        new_config = {
            "id": new_user_id,
            "userId": new_user_id,
            "name": f"Migrated {device_type.title()} Config for {new_user_id}",
            "type": "user-config",
            "version": "2.0.0",  # Incremented version for migration
            "deviceType": device_type,
            "targetScreenSize": {"width": screen_width, "height": screen_height},
            # Use cleaned tabs
            "tabs": cleaned_tabs,
            "layouts": old_config.get("layouts", []),
            "currentLayoutId": old_config.get("currentLayoutId", "default"),
            "activeTabId": cleaned_tabs[0]["id"] if cleaned_tabs else "main",
            # Preserve preferences
            "preferences": old_config.get(
                "preferences",
                {
                    "theme": "gzc-dark",
                    "language": "en",
                    "autoSave": True,
                    "syncAcrossDevices": True,
                },
            ),
            # Reset state management
            "componentStates": [],
            "windowState": {
                "dimensions": {"width": screen_width, "height": screen_height},
                "position": {"x": 0, "y": 0},
                "maximized": False,
                "fullscreen": False,
            },
            # New session info
            "currentSession": {
                "sessionId": f"session-{int(datetime.utcnow().timestamp() * 1000)}",
                "deviceInfo": {
                    "userAgent": "",
                    "platform": "",
                    "screenResolution": f"{screen_width}x{screen_height}",
                    "timezone": "UTC",
                    "lastSyncBrowser": "Migration",
                    "lastSyncTime": now,
                },
                "loginTime": now,
                "lastActivity": now,
                "activeTabIds": [cleaned_tabs[0]["id"]] if cleaned_tabs else ["main"],
                "openLayouts": ["default"],
            },
            "userMemory": old_config.get("userMemory", []),
            # Metadata
            "createdAt": old_config.get("createdAt", now),
            "updatedAt": now,
            "lastSyncAt": now,
            "deviceId": None,
            "previousVersions": [],  # Start fresh - no version history bloat
            # Feature flags
            "featureFlags": {
                "experimentalComponents": False,
                "advancedGridLayout": True,
                "cloudSync": True,
            },
            # Migration info
            "migratedFrom": old_user_id,
            "migrationDate": now,
            "userEmail": user_email,
            "timestamp": now,
        }

        # Save new configuration
        new_item = container.upsert_item(body=new_config)
        logger.info(f"✅ Migrated configuration saved for {new_user_id}")

        # Optionally delete old configuration (commented out for safety)
        # container.delete_item(item=old_user_id, partition_key=old_user_id)
        # logger.info(f"🗑️ Deleted old configuration {old_user_id}")

        return {
            "message": f"Configuration migrated successfully from {old_user_id} to {new_user_id}",
            "oldUserId": old_user_id,
            "newUserId": new_user_id,
            "cleanedTabs": len(cleaned_tabs),
            "originalTabs": len(old_config.get("tabs", [])),
            "deviceType": device_type,
            "configName": new_config["name"],
        }

    except Exception as e:
        logger.error(f"Error migrating configuration: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to migrate configuration: {str(e)}"
        )


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


@router.get("/device-config/{device_type}")
async def get_device_configuration(
    device_type: str, payload: Dict = Depends(validate_token)
) -> Dict[str, Any]:
    """
    Get user-specific device configuration template (laptop, mobile, bigscreen)
    Returns empty template if not found
    """
    if device_type not in ["laptop", "mobile", "bigscreen"]:
        raise HTTPException(
            status_code=400, detail="Device type must be laptop, mobile, or bigscreen"
        )

    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available")

    try:
        # Get user ID consistently (email > oid > name > sub > unknown)
        user_email = (
            payload.get("preferred_username")
            or payload.get("email", "")
            or payload.get("upn", "")
        )
        user_oid = payload.get("oid", "")
        user_sub = payload.get("sub", "")
        user_name = payload.get("name", "")

        if user_email:
            user_id = user_email.lower()
        elif user_oid:
            user_id = f"oid_{user_oid}"
        elif user_name:
            user_id = user_name.lower().replace(" ", "_")
        else:
            user_id = f"sub_{user_sub}" if user_sub else "unknown_user"

        # User-specific device config ID format: "{device_type}_{user_id}"
        device_config_id = f"{device_type}_{user_id}"

        try:
            # Try to get existing user device configuration (assumes PK = /id)
            device_config_doc = container.read_item(
                item=device_config_id, partition_key=device_config_id
            )
            logger.info(
                f"Found existing {device_type} device configuration for user {user_id} using pk=/id"
            )
            return device_config_doc

        except exceptions.CosmosResourceNotFoundError:
            logger.info(
                f"{device_config_id} not found with pk=/id. Retrying with pk=/userId ({user_id})"
            )
            # Retry assuming PK = /userId
            try:
                device_config_doc = container.read_item(
                    item=device_config_id, partition_key=user_id
                )
                logger.info(
                    f"Found existing {device_type} device configuration for user {user_id} using pk=/userId"
                )
                return device_config_doc
            except exceptions.CosmosResourceNotFoundError:
                logger.info(
                    f"No device configuration found for {device_config_id} with either pk, returning empty template"
                )

            # Return empty template
            now = datetime.utcnow().isoformat()
            empty_template = {
                "id": device_config_id,
                "name": f"{device_type.title()} Configuration for {user_id}",
                "type": "user-device-config",
                "deviceType": device_type,
                "userId": user_id,
                "version": "1.0.0",
                "config": {
                    "tabs": [],
                    "preferences": {},
                    "windowState": {},
                    "componentStates": [],
                    "layouts": [],
                },
                "createdAt": now,
                "updatedAt": now,
                "isEmpty": True,
                "message": f"No {device_type} configuration found for {user_id}. Create your custom {device_type} layout.",
            }

            return empty_template

    except Exception as e:
        logger.error(f"Error getting device config for {device_type}: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to get device configuration"
        )


@router.post("/device-config/{device_type}")
async def save_device_configuration(
    device_type: str,
    config_data: Dict[str, Any],
    payload: Dict = Depends(validate_token),
) -> Dict[str, Any]:
    """
    Save device-specific configuration (laptop, mobile, bigscreen)
    """
    if device_type not in ["laptop", "mobile", "bigscreen"]:
        raise HTTPException(
            status_code=400, detail="Device type must be laptop, mobile, or bigscreen"
        )

    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available")

    try:
        # Get user info from validated token - FIXED: Use all available fields
        user_email = (
            payload.get("preferred_username")
            or payload.get("email", "")
            or payload.get("upn", "")
        )
        user_oid = payload.get("oid", "")
        user_sub = payload.get("sub", "")
        user_name = payload.get("name", "")

        # Log what we got from the token for debugging
        logger.info(
            f"Save device config - Token payload contains: email={user_email}, oid={user_oid[:8] if user_oid else 'None'}..., sub={user_sub[:8] if user_sub else 'None'}..., name={user_name}"
        )

        # Priority: email > oid > sub > name (email is most consistent for sync)
        if user_email:
            user_id = user_email.lower()  # Normalize email case
        elif user_oid:
            user_id = f"oid_{user_oid}"
        elif user_name:
            user_id = user_name.lower().replace(" ", "_")
        else:
            user_id = f"sub_{user_sub}" if user_sub else "unknown_user"

        # Reject saving when identity is unknown to avoid stray docs
        if user_id.startswith("unknown"):
            logger.error("Rejecting save: no user identity present in token")
            raise HTTPException(status_code=401, detail="No user identity in token")

        # User-specific device config ID format: "{device_type}_{user_id}"
        device_config_id = f"{device_type}_{user_id}"
        now = datetime.utcnow().isoformat()

        # Clean the tabs data - remove PostgreSQL format and keep only new format
        clean_tabs = []
        raw_tabs = config_data.get("tabs", None)

        if isinstance(raw_tabs, list):
            for tab in raw_tabs:
                # Skip old PostgreSQL format tabs (they have 'user_id', 'tab_id', 'created_at' fields)
                if isinstance(tab, dict) and any(
                    key in tab for key in ["user_id", "created_at", "updated_at"]
                ):
                    logger.info(
                        f"Skipping old PostgreSQL format tab: {tab.get('title', 'unnamed')}"
                    )
                    continue

                # Only keep new format tabs (they have 'name', 'component', 'type' fields)
                if isinstance(tab, dict) and "name" in tab and "component" in tab:
                    clean_tabs.append(tab)
                    logger.info(f"Keeping new format tab: {tab.get('name', 'unnamed')}")

        # Load existing document to merge partial updates (avoid wiping tabs)
        existing_doc = None
        try:
            existing_doc = container.read_item(
                item=device_config_id, partition_key=device_config_id
            )
        except exceptions.CosmosResourceNotFoundError:
            existing_doc = None

        existing_config = (existing_doc or {}).get("config", {})

        # Merge logic: only replace arrays when explicitly provided with non-empty arrays
        incoming_prefs = config_data.get("preferences") or {}
        incoming_ws = config_data.get("windowState") or {}
        incoming_cs = config_data.get("componentStates")
        incoming_layouts = config_data.get("layouts")

        merged_config = {
            "tabs": clean_tabs
            if len(clean_tabs) > 0
            else existing_config.get("tabs", []),
            "preferences": {**existing_config.get("preferences", {}), **incoming_prefs},
            "windowState": {**existing_config.get("windowState", {}), **incoming_ws},
            "componentStates": incoming_cs
            if incoming_cs is not None
            else existing_config.get("componentStates", []),
            "layouts": (
                incoming_layouts
                if isinstance(incoming_layouts, list) and len(incoming_layouts) > 0
                else existing_config.get("layouts", [])
            ),
        }

        # Prepare user device configuration document
        device_config_doc = {
            "id": device_config_id,
            "name": f"{device_type.title()} Configuration for {user_id}",
            "type": "user-device-config",
            "deviceType": device_type,
            "userId": user_id,
            "version": config_data.get(
                "version", (existing_doc or {}).get("version", "1.0.0")
            ),
            "config": merged_config,
            "createdBy": (existing_doc or {}).get("createdBy", user_id),
            "updatedBy": user_id,
            "createdAt": (existing_doc or {}).get("createdAt", now),
            "updatedAt": now,
            "lastModified": now,
        }

        # Save the device configuration
        saved_doc = container.upsert_item(body=device_config_doc)
        logger.info(
            f"Device configuration '{device_config_doc['name']}' saved by {user_id}"
        )

        return {
            "message": f"{device_type.title()} configuration saved successfully",
            "deviceType": device_type,
            "configName": device_config_doc["name"],
            "savedBy": user_id,
            "config": saved_doc,
        }

    except Exception as e:
        logger.error(f"Error saving device config for {device_type}: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to save device configuration"
        )


@router.delete("/device-config/{device_type}")
async def delete_device_configuration(
    device_type: str, payload: Dict = Depends(validate_token)
) -> Dict[str, str]:
    """
    Delete device-specific configuration
    """
    if device_type not in ["laptop", "mobile", "bigscreen"]:
        raise HTTPException(
            status_code=400, detail="Device type must be laptop, mobile, or bigscreen"
        )

    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available")

    try:
        # Get user info for logging (email > oid > name > unknown)
        user_email = (
            payload.get("preferred_username")
            or payload.get("email", "")
            or payload.get("upn", "")
        )
        user_oid = payload.get("oid", "")
        user_name = payload.get("name", "")
        if user_email:
            user_id = user_email.lower()
        elif user_oid:
            user_id = f"oid_{user_oid}"
        elif user_name:
            user_id = user_name.lower().replace(" ", "_")
        else:
            user_id = "unknown_user"

        # User-specific device config ID format: "{device_type}_{user_id}"
        device_config_id = f"{device_type}_{user_id}"

        # Delete the device configuration
        container.delete_item(item=device_config_id, partition_key=device_config_id)
        logger.info(f"Device configuration {device_type} deleted by {user_id}")

        return {"message": f"{device_type.title()} configuration deleted successfully"}

    except exceptions.CosmosResourceNotFoundError:
        return {"message": f"No {device_type} configuration to delete"}
    except Exception as e:
        logger.error(f"Error deleting device config for {device_type}: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to delete device configuration"
        )


@router.get("/device-configs")
async def list_user_device_configurations(
    payload: Dict = Depends(validate_token),
) -> Dict[str, Any]:
    """
    List user's device configurations
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available")

    try:
        # Get user ID consistently
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_oid = payload.get("oid", "")
        user_sub = payload.get("sub", "")

        if user_email:
            user_id = user_email.lower()
        elif user_oid:
            user_id = f"oid_{user_oid}"
        else:
            user_id = f"sub_{user_sub}" if user_sub else "unknown_user"

        # Query for user's device configurations
        query = f"SELECT * FROM c WHERE c.type = 'user-device-config' AND c.userId = '{user_id}'"
        device_configs = list(
            container.query_items(query=query, enable_cross_partition_query=True)
        )

        configs_summary = []
        for config in device_configs:
            configs_summary.append(
                {
                    "deviceType": config.get("deviceType"),
                    "name": config.get("name"),
                    "version": config.get("version"),
                    "lastUpdated": config.get("updatedAt"),
                    "createdBy": config.get("createdBy"),
                    "userId": config.get("userId"),
                    "isEmpty": len(config.get("config", {}).get("tabs", [])) == 0,
                }
            )

        # Check which device types are missing
        existing_types = {config.get("deviceType") for config in device_configs}
        all_types = {"laptop", "mobile", "bigscreen"}
        missing_types = all_types - existing_types

        return {
            "deviceConfigurations": configs_summary,
            "total": len(configs_summary),
            "userId": user_id,
            "availableTypes": ["laptop", "mobile", "bigscreen"],
            "existingTypes": list(existing_types),
            "missingTypes": list(missing_types),
        }

    except Exception as e:
        logger.error(f"Error listing device configs: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to list device configurations"
        )


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
