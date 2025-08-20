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
COSMOS_ENDPOINT = os.getenv("COSMOS_ENDPOINT", "https://cosmos-research-analytics-prod.documents.azure.com:443/")
DATABASE_ID = os.getenv("COSMOS_DATABASE", "gzc-intel-app-config")
CONTAINER_ID = os.getenv("COSMOS_CONTAINER", "user-configurations")

# Initialize Cosmos client with managed identity - delayed initialization
container = None
cosmos_client = None

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
            logger.info(f"✅ Cosmos DB connected using key authentication for {COSMOS_ENDPOINT}")
            return container
        except Exception as key_error:
            logger.warning(f"Key-based authentication failed: {str(key_error)[:200]}")
    else:
        logger.info("No COSMOS_KEY found - trying managed identity")
    
    # Fallback to managed identity
    try:
        logger.info(f"Attempting to connect to Cosmos DB at {COSMOS_ENDPOINT} using Managed Identity")
        credential = DefaultAzureCredential()
        cosmos_client = CosmosClient(COSMOS_ENDPOINT, credential=credential)
        database = cosmos_client.get_database_client(DATABASE_ID)
        container = database.get_container_client(CONTAINER_ID)
        
        # Verify connection by reading database properties
        database.read()
        logger.info(f"✅ Cosmos DB connected using Managed Identity for {COSMOS_ENDPOINT}")
        return container
    except Exception as managed_identity_error:
        logger.warning(f"Managed Identity failed: {str(managed_identity_error)[:200]}")
        
        # Both methods failed
        logger.error(f"❌ Cosmos DB initialization failed completely")
        logger.info("ℹ️ Ensure: 1) COSMOS_KEY is set, 2) Managed Identity has Cosmos DB access, or 3) Container App uses NAT Gateway IP")
        container = None
        return None


@router.get("/config")
async def get_user_config(payload: Dict = Depends(validate_token)) -> Optional[Dict[str, Any]]:
    """
    Get user configuration from Cosmos DB
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available - check NAT Gateway IP whitelisting")
    
    try:
        # Always use email as the consistent ID across browsers
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_id = user_email if user_email else payload.get("sub", "unknown_user")
        logger.info(f"Loading configuration for user {user_id} (email: {user_email})")
        
        # Try to read the document
        item = container.read_item(item=user_id, partition_key=user_id)
        return item
        
    except exceptions.CosmosResourceNotFoundError:
        logger.info(f"No configuration found for user {user_id}, returning default")
        # Return comprehensive default configuration for first-time users
        now = datetime.utcnow().isoformat()
        return {
            "id": user_id,
            "userId": user_id,
            "type": "user-config",
            "version": "1.0.0",
            
            # Core configuration
            "tabs": [
                {
                    "id": "main",
                    "name": "Main",
                    "component": "Analytics",
                    "type": "dynamic",
                    "icon": "home",
                    "closable": False,
                    "gridLayoutEnabled": True,
                    "components": [],
                    "editMode": False,
                    "position": 0
                }
            ],
            "layouts": [],
            "currentLayoutId": "default",
            "activeTabId": "main",
            
            # User preferences
            "preferences": {
                "theme": "gzc-dark",
                "language": "en",
                "autoSave": True,
                "syncAcrossDevices": True,
                "notifications": {
                    "enabled": True,
                    "types": ["system", "component-updates"]
                },
                "accessibility": {
                    "highContrast": False,
                    "fontSize": "medium",
                    "animations": True
                },
                "performance": {
                    "enableLazyLoading": True,
                    "maxComponentsPerTab": 20
                }
            },
            
            # State management
            "componentStates": [],
            "windowState": {
                "dimensions": {"width": 1920, "height": 1080},
                "position": {"x": 0, "y": 0},
                "maximized": False,
                "fullscreen": False
            },
            
            # Session and memory
            "currentSession": {
                "sessionId": f"session-{int(datetime.utcnow().timestamp() * 1000)}",
                "deviceInfo": {
                    "userAgent": "",
                    "platform": "",
                    "screenResolution": "",
                    "timezone": "UTC"
                },
                "loginTime": now,
                "lastActivity": now,
                "activeTabIds": ["main"],
                "openLayouts": ["default"]
            },
            "userMemory": [],
            
            # Metadata
            "createdAt": now,
            "updatedAt": now,
            "lastSyncAt": now,
            "deviceId": None,
            "previousVersions": [],
            
            # Feature flags
            "featureFlags": {
                "experimentalComponents": False,
                "advancedGridLayout": True,
                "cloudSync": True
            },
            
            # Legacy compatibility
            "userEmail": payload.get("preferred_username", ""),
            "timestamp": now,
            "isDefault": True
        }
    except Exception as e:
        logger.error(f"Error reading configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to load configuration")


@router.post("/config")
async def save_user_config(
    config: Dict[str, Any],
    payload: Dict = Depends(validate_token)
) -> Dict[str, Any]:
    """
    Save user configuration to Cosmos DB
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available - check NAT Gateway IP whitelisting")
    
    try:
        # Always use email as the consistent ID across browsers
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_id = user_email if user_email else payload.get("sub", "unknown_user")
        logger.info(f"Saving configuration for user {user_id} (email: {user_email})")
        
        # Deduplicate tabs before saving
        tabs = config.get("tabs", [])
        seen_tab_ids = set()
        unique_tabs = []
        for tab in tabs:
            if tab.get("id") not in seen_tab_ids:
                seen_tab_ids.add(tab.get("id"))
                unique_tabs.append(tab)
            else:
                logger.warning(f"Removing duplicate tab {tab.get('id')} for user {user_id}")
        
        # Prepare comprehensive document
        now = datetime.utcnow().isoformat()
        
        # Get existing document for versioning
        existing_doc = None
        try:
            existing_doc = container.read_item(item=user_id, partition_key=user_id)
        except exceptions.CosmosResourceNotFoundError:
            pass
        
        # Preserve previous versions (keep last 5)
        previous_versions = []
        if existing_doc:
            previous_versions = existing_doc.get("previousVersions", [])[-4:]  # Keep last 4
            previous_versions.append({
                "version": existing_doc.get("version", "1.0.0"),
                "data": {
                    "tabs": existing_doc.get("tabs", []),
                    "preferences": existing_doc.get("preferences", {}),
                    "activeTabId": existing_doc.get("activeTabId")
                },
                "timestamp": existing_doc.get("updatedAt", now)
            })
        
        document = {
            "id": user_id,
            "userId": user_id,
            "type": "user-config",
            "version": config.get("version", "1.0.0"),
            
            # Core configuration
            "tabs": unique_tabs,
            "layouts": config.get("layouts", []),
            "currentLayoutId": config.get("currentLayoutId", "default"),
            "activeTabId": config.get("activeTabId", unique_tabs[0]["id"] if unique_tabs else "main"),
            
            # User preferences
            "preferences": config.get("preferences", {}),
            
            # State management
            "componentStates": config.get("componentStates", []),
            "windowState": config.get("windowState", {
                "dimensions": {"width": 1920, "height": 1080},
                "position": {"x": 0, "y": 0},
                "maximized": False,
                "fullscreen": False
            }),
            
            # Session and memory
            "currentSession": {
                **config.get("currentSession", {}),
                "lastActivity": now,
                "sessionId": config.get("currentSession", {}).get("sessionId", f"session-{int(datetime.utcnow().timestamp() * 1000)}")
            },
            "userMemory": config.get("userMemory", []),
            
            # Metadata
            "createdAt": existing_doc.get("createdAt", now) if existing_doc else now,
            "updatedAt": now,
            "lastSyncAt": now,
            "deviceId": config.get("deviceId"),
            "previousVersions": previous_versions,
            
            # Feature flags
            "featureFlags": config.get("featureFlags", {
                "experimentalComponents": False,
                "advancedGridLayout": True,
                "cloudSync": True
            }),
            
            # Legacy compatibility
            "userEmail": user_email,
            "timestamp": now,
            "componentStates": config.get("componentStates", {}),  # Backward compatibility
            "sessionData": config.get("sessionData", {})  # Backward compatibility
        }
        
        # Upsert the document
        item = container.upsert_item(body=document)
        logger.info(f"Configuration saved for user {user_id}")
        return item
        
    except Exception as e:
        logger.error(f"Error saving configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to save configuration")


@router.post("/user-memory")
async def save_user_memory(
    memory_data: Dict[str, Any],
    payload: Dict = Depends(validate_token)
) -> Dict[str, Any]:
    """
    Save user memory data to Cosmos DB (replaces PostgreSQL)
    Compatible with frontend UserMemoryStore
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available - check NAT Gateway IP whitelisting")
    
    try:
        # Use email as consistent ID
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_id = user_email if user_email else payload.get("sub", "unknown_user")
        
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
            "type": "user-memory"
        }
        
        # Upsert the document
        item = container.upsert_item(body=document)
        logger.info(f"Memory saved for {user_id}/{memory_type}/{memory_key}")
        
        return {
            "success": True,
            "memoryData": memory_content,
            "version": item.get("version", 1),
            "updatedAt": item.get("timestamp")
        }
        
    except Exception as e:
        logger.error(f"Error saving user memory: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save memory: {str(e)}")


@router.get("/user-memory")
async def load_user_memory(
    memoryType: str,
    memoryKey: str,
    payload: Dict = Depends(validate_token)
) -> Dict[str, Any]:
    """
    Load user memory data from Cosmos DB
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available")
    
    try:
        # Use email as consistent ID
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_id = user_email if user_email else payload.get("sub", "unknown_user")
        
        # Document ID for Cosmos DB
        doc_id = f"{user_id}_{memoryType}_{memoryKey}"
        
        # Try to read the document
        item = container.read_item(item=doc_id, partition_key=doc_id)
        
        return {
            "memoryData": item.get("memoryData", {}),
            "version": item.get("version", 1),
            "updatedAt": item.get("timestamp")
        }
        
    except exceptions.CosmosResourceNotFoundError:
        logger.info(f"No memory found for {user_id}/{memoryType}/{memoryKey}")
        return {
            "memoryData": {},
            "version": 0,
            "updatedAt": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error loading user memory: {e}")
        raise HTTPException(status_code=500, detail="Failed to load memory")


@router.put("/config")
async def update_user_config(
    updates: Dict[str, Any],
    payload: Dict = Depends(validate_token)
) -> Dict[str, Any]:
    """
    Update specific fields in user configuration
    """
    container = get_cosmos_container()
    if not container:
        raise HTTPException(status_code=503, detail="Cosmos DB not available")
    
    try:
        # Always use email as the consistent ID across browsers
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_id = user_email if user_email else payload.get("sub", "unknown_user")
        logger.info(f"Updating configuration for user {user_id} (email: {user_email})")
        
        # Get existing document
        try:
            existing = container.read_item(item=user_id, partition_key=user_id)
        except exceptions.CosmosResourceNotFoundError:
            existing = {
                "id": user_id,
                "userId": user_id,
                "userEmail": user_email,
                "type": "user-config"
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
        # Always use email as the consistent ID across browsers
        user_email = payload.get("preferred_username") or payload.get("email", "")
        user_id = user_email if user_email else payload.get("sub", "unknown_user")
        logger.info(f"Deleting configuration for user {user_id} (email: {user_email})")
        
        container.delete_item(item=user_id, partition_key=user_id)
        logger.info(f"Configuration deleted for user {user_id}")
        return {"message": "Configuration deleted successfully"}
        
    except exceptions.CosmosResourceNotFoundError:
        return {"message": "No configuration to delete"}
    except Exception as e:
        logger.error(f"Error deleting configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete configuration")


@router.get("/health")
async def cosmos_health_check() -> Dict[str, Any]:
    """
    Check Cosmos DB connectivity
    """
    try:
        container = get_cosmos_container()
        if not container:
            return {
                "status": "error",
                "message": "Cosmos DB client not initialized"
            }
        
        # Try to query the container
        query = "SELECT VALUE COUNT(1) FROM c"
        items = list(container.query_items(query=query, enable_cross_partition_query=True))
        
        return {
            "status": "healthy",
            "endpoint": COSMOS_ENDPOINT,
            "database": DATABASE_ID,
            "container": CONTAINER_ID,
            "document_count": items[0] if items else 0
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }