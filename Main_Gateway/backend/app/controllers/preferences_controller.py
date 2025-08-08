"""
User Preferences Controller for FastAPI
Handles user preferences, tabs, and component layouts with PostgreSQL
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
import json
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/preferences", tags=["preferences"])

# Database configuration
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'gzcdevserver.postgres.database.azure.com'),
    'database': os.getenv('POSTGRES_DB', 'gzc_intel'),
    'user': os.getenv('POSTGRES_USER', 'mikael'),
    'password': os.getenv('POSTGRES_PASSWORD', 'Ii89rra137+*'),
    'port': os.getenv('POSTGRES_PORT', '5432')
}

# Create connection pool
try:
    connection_pool = SimpleConnectionPool(1, 10, **DB_CONFIG)
    print(f"✅ Connected to PostgreSQL: {DB_CONFIG['host']}/{DB_CONFIG['database']}")
except Exception as e:
    print(f"❌ Failed to connect to PostgreSQL: {e}")
    connection_pool = None

def get_db_connection():
    """Get a database connection from the pool"""
    if connection_pool:
        return connection_pool.getconn()
    raise HTTPException(status_code=503, detail="Database connection unavailable")

def return_db_connection(conn):
    """Return a database connection to the pool"""
    if connection_pool and conn:
        connection_pool.putconn(conn)

# Import proper Azure AD auth
from app.auth.azure_auth import validate_token

def get_current_user(token_payload: dict = Depends(validate_token)):
    """Get current user ID from validated Azure AD token"""
    # Extract user ID from Azure AD token claims
    user_id = (
        token_payload.get("sub") or  # Subject claim
        token_payload.get("oid") or  # Object ID  
        token_payload.get("preferred_username") or  # Email/UPN
        token_payload.get("email") or
        "default-user"  # Fallback only
    )
    return user_id

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
    finally:
        if conn:
            return_db_connection(conn)

@router.get("/user")
async def get_user_preferences(user_id: str = Depends(get_current_user)):
    """Get user preferences"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM user_preferences WHERE user_id = %s
            """, (user_id,))
            result = cur.fetchone()
            
            if not result:
                # Create default preferences if user doesn't exist
                cur.execute("""
                    INSERT INTO user_preferences (
                        user_id, email, theme, language, timezone, 
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    user_id, f"{user_id}@gzc.com", 
                    'dark', 'en', 'UTC',
                    datetime.now(), datetime.now()
                ))
                result = cur.fetchone()
                conn.commit()
            
            return result
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            return_db_connection(conn)

@router.put("/user")
async def update_user_preferences(
    preferences: Dict[str, Any],
    user_id: str = Depends(get_current_user)
):
    """Update user preferences"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Build dynamic update query
            update_fields = []
            values = []
            for key, value in preferences.items():
                if key not in ['user_id', 'created_at']:
                    update_fields.append(f"{key} = %s")
                    values.append(json.dumps(value) if isinstance(value, (dict, list)) else value)
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            values.extend([datetime.now(), user_id])
            
            cur.execute(f"""
                UPDATE user_preferences 
                SET {', '.join(update_fields)}, updated_at = %s
                WHERE user_id = %s
                RETURNING *
            """, values)
            
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="User not found")
            
            conn.commit()
            return result
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            return_db_connection(conn)

@router.get("/tabs")
async def get_user_tabs(user_id: str = Depends(get_current_user)):
    """Get all tabs for a user"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM tab_configurations 
                WHERE user_id = %s 
                ORDER BY order_index, created_at
            """, (user_id,))
            results = cur.fetchall()
            return {"tabs": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            return_db_connection(conn)

@router.post("/tabs")
async def create_tab(
    tab: Dict[str, Any],
    user_id: str = Depends(get_current_user)
):
    """Create a new tab"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # First ensure user exists
            cur.execute("SELECT user_id FROM user_preferences WHERE user_id = %s", (user_id,))
            if not cur.fetchone():
                # Create user if doesn't exist
                cur.execute("""
                    INSERT INTO user_preferences (user_id, email, created_at, updated_at)
                    VALUES (%s, %s, %s, %s)
                """, (user_id, f"{user_id}@gzc.com", datetime.now(), datetime.now()))
            
            cur.execute("""
                INSERT INTO tab_configurations (
                    user_id, tab_id, title, icon, order_index, is_active, 
                    is_pinned, tab_type, component_ids, layout_config,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                user_id,
                tab.get('tab_id', tab.get('id')),
                tab.get('title', tab.get('name', 'New Tab')),
                tab.get('icon'),
                tab.get('order_index', 0),
                tab.get('is_active', False),
                tab.get('is_pinned', False),
                tab.get('tab_type', tab.get('type', 'dynamic')),
                json.dumps(tab.get('component_ids', tab.get('components', []))),
                json.dumps(tab.get('layout_config', {})),
                datetime.now(),
                datetime.now()
            ))
            result = cur.fetchone()
            conn.commit()
            return result
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            return_db_connection(conn)

@router.put("/tabs/{tab_id}")
async def update_tab(
    tab_id: str,
    updates: Dict[str, Any],
    user_id: str = Depends(get_current_user)
):
    """Update a tab configuration"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Build dynamic update
            update_fields = []
            values = []
            
            for key, value in updates.items():
                if key not in ['id', 'user_id', 'tab_id', 'created_at']:
                    if key in ['component_ids', 'components', 'layout_config', 'filters', 'custom_settings']:
                        update_fields.append(f"{key if key != 'components' else 'component_ids'} = %s")
                        values.append(json.dumps(value))
                    else:
                        update_fields.append(f"{key} = %s")
                        values.append(value)
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            values.extend([datetime.now(), user_id, tab_id])
            
            cur.execute(f"""
                UPDATE tab_configurations
                SET {', '.join(update_fields)}, updated_at = %s
                WHERE user_id = %s AND tab_id = %s
                RETURNING *
            """, values)
            
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Tab not found")
            
            conn.commit()
            return result
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            return_db_connection(conn)

@router.delete("/tabs/{tab_id}")
async def delete_tab(
    tab_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a tab"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Delete associated components first
            cur.execute("""
                DELETE FROM component_layouts 
                WHERE user_id = %s AND tab_id = %s
            """, (user_id, tab_id))
            
            # Delete the tab
            cur.execute("""
                DELETE FROM tab_configurations 
                WHERE user_id = %s AND tab_id = %s
                RETURNING tab_id
            """, (user_id, tab_id))
            
            deleted = cur.fetchone()
            if not deleted:
                raise HTTPException(status_code=404, detail="Tab not found")
            
            conn.commit()
            return {"success": True, "deleted_tab_id": tab_id}
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            return_db_connection(conn)

@router.get("/tabs/{tab_id}/components")
async def get_tab_components(
    tab_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get all components for a tab"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM component_layouts 
                WHERE user_id = %s AND tab_id = %s
                ORDER BY z_index, grid_y, grid_x
            """, (user_id, tab_id))
            results = cur.fetchall()
            return {"components": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            return_db_connection(conn)

@router.post("/tabs/{tab_id}/components")
async def add_component(
    tab_id: str,
    component: Dict[str, Any],
    user_id: str = Depends(get_current_user)
):
    """Add a component to a tab"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO component_layouts (
                    user_id, tab_id, component_id, component_type,
                    grid_x, grid_y, grid_width, grid_height,
                    is_visible, component_config, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                user_id, tab_id,
                component.get('component_id', component.get('id')),
                component.get('component_type', component.get('type')),
                component.get('grid_x', component.get('x', 0)),
                component.get('grid_y', component.get('y', 0)),
                component.get('grid_width', component.get('w', 4)),
                component.get('grid_height', component.get('h', 4)),
                component.get('is_visible', True),
                json.dumps(component.get('component_config', component.get('props', {}))),
                datetime.now(),
                datetime.now()
            ))
            result = cur.fetchone()
            conn.commit()
            return result
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            return_db_connection(conn)

@router.post("/layouts/bulk")
async def bulk_save_layouts(
    data: Dict[str, Any],
    user_id: str = Depends(get_current_user)
):
    """Bulk save multiple component layouts"""
    conn = None
    try:
        tab_id = data.get('tab_id')
        layouts = data.get('layouts', [])
        
        if not tab_id:
            raise HTTPException(status_code=400, detail="tab_id is required")
        
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Delete existing layouts for this tab
            cur.execute("""
                DELETE FROM component_layouts 
                WHERE user_id = %s AND tab_id = %s
            """, (user_id, tab_id))
            
            # Insert new layouts
            saved_layouts = []
            for layout in layouts:
                cur.execute("""
                    INSERT INTO component_layouts (
                        user_id, tab_id, component_id, component_type,
                        grid_x, grid_y, grid_width, grid_height,
                        is_visible, component_config, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    user_id, tab_id,
                    layout.get('component_id', layout.get('id')),
                    layout.get('component_type', layout.get('componentId')),
                    layout.get('grid_x', layout.get('x', 0)),
                    layout.get('grid_y', layout.get('y', 0)),
                    layout.get('grid_width', layout.get('w', 4)),
                    layout.get('grid_height', layout.get('h', 4)),
                    layout.get('is_visible', True),
                    json.dumps(layout.get('component_config', layout.get('props', {}))),
                    datetime.now(),
                    datetime.now()
                ))
                saved_layouts.append(cur.fetchone())
            
            conn.commit()
            return {"layouts": saved_layouts}
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            return_db_connection(conn)