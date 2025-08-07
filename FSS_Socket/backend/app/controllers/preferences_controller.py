"""
User Preferences API Controller
RESTful API endpoints for user preferences management
"""
import logging
from flask import Blueprint, request, jsonify, g
from functools import wraps
from typing import Dict, Any
import jwt
from datetime import datetime
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.services.preferences_service import PreferencesService
from app.dao.redis_dao import RedisDAO
from app.models.user_preferences import Base

logger = logging.getLogger(__name__)

# Create Blueprint
preferences_bp = Blueprint('preferences', __name__, url_prefix='/api/preferences')

# Database configuration
DB_HOST = os.getenv("POSTGRES_HOST", "gzcdevserver.postgres.database.azure.com")
DB_NAME = os.getenv("POSTGRES_DB", "gzc_intel")
DB_USER = os.getenv("POSTGRES_USER", "gzcadmin")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")

# Create database engine
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Initialize Redis for caching
redis_dao = RedisDAO(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", "6379")),
    password=os.getenv("REDIS_PASSWORD"),
    ssl=os.getenv("REDIS_SSL", "False") == "True",
    db=1  # Use different DB for preferences
)


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        db.close()
        raise


def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'No authorization header'}), 401
        
        try:
            # Extract token
            token = auth_header.replace('Bearer ', '')
            
            # For Azure AD tokens, we would validate with Azure
            # For now, decode without verification in dev mode
            if os.getenv("DEBUG", "False") == "True":
                # Dev mode - extract user info from token without verification
                import base64
                import json
                parts = token.split('.')
                if len(parts) >= 2:
                    # Decode JWT payload (add padding if needed)
                    payload = parts[1]
                    payload += '=' * (4 - len(payload) % 4)
                    decoded = base64.urlsafe_b64decode(payload)
                    user_info = json.loads(decoded)
                    g.user_id = user_info.get('oid', user_info.get('sub', 'dev-user'))
                    g.user_email = user_info.get('email', user_info.get('upn', 'dev@gzcim.com'))
                else:
                    # Fallback for dev
                    g.user_id = 'dev-user'
                    g.user_email = 'dev@gzcim.com'
            else:
                # Production mode - validate with Azure AD
                # TODO: Implement proper Azure AD validation
                return jsonify({'error': 'Token validation not implemented'}), 501
                
        except Exception as e:
            logger.error(f"Auth error: {e}")
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function


@preferences_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        db = get_db()
        db.execute("SELECT 1")
        db.close()
        
        # Check Redis connection
        redis_status = "connected" if redis_dao.redis.ping() else "disconnected"
        
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'redis': redis_status,
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503


@preferences_bp.route('/user', methods=['GET'])
@require_auth
def get_user_preferences():
    """Get current user's preferences"""
    try:
        db = get_db()
        service = PreferencesService(db, redis_dao)
        
        preferences = service.get_user_preferences(g.user_id)
        
        if not preferences:
            # Return default preferences for new users
            return jsonify({
                'user_id': g.user_id,
                'email': g.user_email,
                'theme': 'dark',
                'language': 'en',
                'timezone': 'UTC',
                'tabs': [],
                'layouts': []
            })
        
        return jsonify(preferences)
        
    except Exception as e:
        logger.error(f"Error getting preferences: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@preferences_bp.route('/user', methods=['POST', 'PUT'])
@require_auth
def update_user_preferences():
    """Update current user's preferences"""
    try:
        db = get_db()
        service = PreferencesService(db, redis_dao)
        
        preferences_data = request.json
        updated = service.create_or_update_preferences(
            g.user_id, 
            g.user_email,
            preferences_data
        )
        
        return jsonify(updated)
        
    except Exception as e:
        logger.error(f"Error updating preferences: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@preferences_bp.route('/tabs', methods=['GET'])
@require_auth
def get_user_tabs():
    """Get all tabs for current user"""
    try:
        db = get_db()
        service = PreferencesService(db, redis_dao)
        
        preferences = service.get_user_preferences(g.user_id)
        tabs = preferences.get('tabs', []) if preferences else []
        
        return jsonify({'tabs': tabs})
        
    except Exception as e:
        logger.error(f"Error getting tabs: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@preferences_bp.route('/tabs', methods=['POST'])
@require_auth
def save_tab():
    """Save or update a tab configuration"""
    try:
        db = get_db()
        service = PreferencesService(db, redis_dao)
        
        tab_data = request.json
        saved_tab = service.save_tab_configuration(g.user_id, tab_data)
        
        return jsonify(saved_tab)
        
    except Exception as e:
        logger.error(f"Error saving tab: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@preferences_bp.route('/tabs/<tab_id>', methods=['DELETE'])
@require_auth
def delete_tab(tab_id):
    """Delete a tab"""
    try:
        db = get_db()
        service = PreferencesService(db, redis_dao)
        
        success = service.delete_tab(g.user_id, tab_id)
        
        if success:
            return jsonify({'message': 'Tab deleted successfully'})
        else:
            return jsonify({'error': 'Tab not found'}), 404
            
    except Exception as e:
        logger.error(f"Error deleting tab: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@preferences_bp.route('/layouts', methods=['POST'])
@require_auth
def save_layout():
    """Save component layout"""
    try:
        db = get_db()
        service = PreferencesService(db, redis_dao)
        
        layout_data = request.json
        saved_layout = service.save_component_layout(g.user_id, layout_data)
        
        return jsonify(saved_layout)
        
    except Exception as e:
        logger.error(f"Error saving layout: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@preferences_bp.route('/layouts/bulk', methods=['POST'])
@require_auth
def bulk_save_layouts():
    """Bulk save multiple component layouts"""
    try:
        db = get_db()
        service = PreferencesService(db, redis_dao)
        
        data = request.json
        tab_id = data.get('tab_id')
        layouts = data.get('layouts', [])
        
        if not tab_id:
            return jsonify({'error': 'tab_id is required'}), 400
        
        saved_layouts = service.bulk_save_layouts(g.user_id, tab_id, layouts)
        
        return jsonify({'layouts': saved_layouts})
        
    except Exception as e:
        logger.error(f"Error bulk saving layouts: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@preferences_bp.route('/reset', methods=['POST'])
@require_auth
def reset_preferences():
    """Reset user preferences to defaults"""
    try:
        db = get_db()
        service = PreferencesService(db, redis_dao)
        
        # Delete existing preferences
        from app.models.user_preferences import UserPreferences, TabConfiguration, ComponentLayout
        
        # Delete all user data
        db.query(ComponentLayout).filter_by(user_id=g.user_id).delete()
        db.query(TabConfiguration).filter_by(user_id=g.user_id).delete()
        db.query(UserPreferences).filter_by(user_id=g.user_id).delete()
        db.commit()
        
        # Create new default preferences
        default_prefs = {
            'theme': 'dark',
            'language': 'en',
            'timezone': 'UTC'
        }
        
        updated = service.create_or_update_preferences(
            g.user_id,
            g.user_email,
            default_prefs
        )
        
        return jsonify(updated)
        
    except Exception as e:
        logger.error(f"Error resetting preferences: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()