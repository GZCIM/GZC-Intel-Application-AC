from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Any, Dict, Optional
import json
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.engine import Engine
from app.database.connection import engine
from app.util.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/user-memory", tags=["user-memory"])

# Request/Response Models
class UserMemoryRequest(BaseModel):
    memoryType: str
    memoryKey: str
    memoryData: Any
    userId: str
    tenantId: str

class UserMemoryResponse(BaseModel):
    memoryData: Any
    version: int
    updatedAt: datetime

class UserMemoryService:
    """Service for managing user-scoped memory data"""
    
    def __init__(self, db_engine: Engine):
        self.engine = db_engine
    
    async def save_memory(
        self, 
        user_id: str, 
        tenant_id: str, 
        memory_type: str, 
        memory_key: str, 
        memory_data: Any
    ) -> None:
        """Save or update user memory data"""
        try:
            # Convert memory_data to JSON string
            json_data = json.dumps(memory_data)
            
            with self.engine.connect() as conn:
                # Use PostgreSQL upsert with ON CONFLICT
                query = text("""
                    INSERT INTO user_memory (user_id, tenant_id, memory_type, memory_key, memory_data, version, created_at, updated_at)
                    VALUES (:user_id, :tenant_id, :memory_type, :memory_key, :memory_data, 1, NOW(), NOW())
                    ON CONFLICT (user_id, tenant_id, memory_type, memory_key) 
                    DO UPDATE SET 
                        memory_data = EXCLUDED.memory_data,
                        version = user_memory.version + 1,
                        updated_at = NOW()
                """)
                
                conn.execute(query, {
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                    "memory_type": memory_type,
                    "memory_key": memory_key,
                    "memory_data": json_data
                })
                conn.commit()
                
                logger.info(f"Saved user memory: {user_id}/{memory_type}/{memory_key}")
                
        except Exception as e:
            logger.error(f"Failed to save user memory: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save user memory: {str(e)}"
            )
    
    async def load_memory(
        self, 
        user_id: str, 
        tenant_id: str, 
        memory_type: str, 
        memory_key: str
    ) -> Optional[Dict]:
        """Load user memory data"""
        try:
            with self.engine.connect() as conn:
                query = text("""
                    SELECT memory_data, version, updated_at
                    FROM user_memory
                    WHERE user_id = :user_id 
                      AND tenant_id = :tenant_id
                      AND memory_type = :memory_type 
                      AND memory_key = :memory_key
                """)
                
                result = conn.execute(query, {
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                    "memory_type": memory_type,
                    "memory_key": memory_key
                })
                
                row = result.fetchone()
                if row:
                    memory_data = json.loads(row[0])  # Parse JSON string
                    return {
                        "memoryData": memory_data,
                        "version": row[1],
                        "updatedAt": row[2]
                    }
                
                return None
                
        except Exception as e:
            logger.error(f"Failed to load user memory: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to load user memory: {str(e)}"
            )
    
    async def delete_memory(
        self, 
        user_id: str, 
        tenant_id: str, 
        memory_type: str, 
        memory_key: str
    ) -> bool:
        """Delete user memory data"""
        try:
            with self.engine.connect() as conn:
                query = text("""
                    DELETE FROM user_memory
                    WHERE user_id = :user_id 
                      AND tenant_id = :tenant_id
                      AND memory_type = :memory_type 
                      AND memory_key = :memory_key
                """)
                
                result = conn.execute(query, {
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                    "memory_type": memory_type,
                    "memory_key": memory_key
                })
                conn.commit()
                
                return result.rowcount > 0
                
        except Exception as e:
            logger.error(f"Failed to delete user memory: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete user memory: {str(e)}"
            )

# Service instance
user_memory_service = UserMemoryService(engine)

# TODO: Replace with proper Azure AD authentication
# For now, extracting user info from request headers or body
def get_current_user_info(request_data: UserMemoryRequest) -> Dict[str, str]:
    """Extract user info - TODO: Replace with Azure AD JWT validation"""
    return {
        "user_id": request_data.userId,
        "tenant_id": request_data.tenantId
    }

@router.post("/")
async def save_user_memory(memory_data: UserMemoryRequest):
    """Save user memory data with strict user isolation"""
    
    user_info = get_current_user_info(memory_data)
    
    # Validate required fields
    if not all([
        memory_data.memoryType, 
        memory_data.memoryKey, 
        user_info["user_id"], 
        user_info["tenant_id"]
    ]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required fields"
        )
    
    await user_memory_service.save_memory(
        user_info["user_id"],
        user_info["tenant_id"],
        memory_data.memoryType,
        memory_data.memoryKey,
        memory_data.memoryData
    )
    
    return {"success": True, "message": "Memory saved"}

@router.get("/{memory_type}/{memory_key}")
async def load_user_memory(
    memory_type: str,
    memory_key: str,
    user_id: str,
    tenant_id: str
):
    """Load user memory data with strict user isolation"""
    
    if not all([memory_type, memory_key, user_id, tenant_id]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required parameters"
        )
    
    result = await user_memory_service.load_memory(
        user_id, tenant_id, memory_type, memory_key
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found"
        )
    
    return result

@router.delete("/{memory_type}/{memory_key}")
async def delete_user_memory(
    memory_type: str,
    memory_key: str,
    user_id: str,
    tenant_id: str
):
    """Delete user memory data"""
    
    if not all([memory_type, memory_key, user_id, tenant_id]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required parameters"
        )
    
    deleted = await user_memory_service.delete_memory(
        user_id, tenant_id, memory_type, memory_key
    )
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found"
        )
    
    return {"success": True, "message": "Memory deleted"}

@router.get("/health")
async def user_memory_health():
    """Health check for user memory service"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"User memory health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed"
        )