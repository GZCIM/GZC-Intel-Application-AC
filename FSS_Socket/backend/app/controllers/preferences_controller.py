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
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.services.preferences_service import PreferencesService
from app.dao.redis_dao import RedisDAO
from app.models.user_preferences import Base
from app.auth.azure_ad_validator import AzureADTokenValidator

logger = logging.getLogger(__name__)

# Create Blueprint
preferences_bp = Blueprint('preferences', __name__, url_prefix='/api/preferences')

# Database configuration
DB_HOST = os.getenv("POSTGRES_HOST", "gzcdevserver.postgres.database.azure.com")
DB_NAME = os.getenv("POSTGRES_DB", "gzc_platform")
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

# Initialize Azure AD token validator
# Using frontend's Client ID for consistent authentication
azure_validator = AzureADTokenValidator(
    tenant_id=os.getenv("AZURE_AD_TENANT_ID", "8274c97d-de9d-4328-98cf-2d4ee94bf104"),
    client_id=os.getenv("AZURE_AD_CLIENT_ID", "5e6f0e38-f82e-48d8-aff8-c988a0e16070")
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
            
            # Check if we're in debug mode for fallback behavior
            debug_mode = os.getenv("DEBUG", "False") == "True"
            
            if debug_mode:
                logger.info("Running in DEBUG mode - using fallback auth")
                # Dev mode - try to parse real token first, then fallback
                user_info = azure_validator.validate_token(token)
                if user_info:
                    g.user_id = user_info['user_id']
                    g.user_email = user_info['email']
                    g.user_name = user_info.get('name', g.user_email)
                    logger.info(f"DEBUG mode: Authenticated {g.user_email}")
                else:
                    # Fallback to dev user in debug mode
                    g.user_id = 'dev-user'
                    g.user_email = 'dev@gzcim.com'
                    g.user_name = 'Development User'
                    logger.info("DEBUG mode: Using fallback dev credentials")
            else:
                # Production mode - validate with Azure AD (required)
                user_info = azure_validator.validate_token(token)
                if not user_info:
                    return jsonify({'error': 'Invalid or expired token'}), 401
                    
                g.user_id = user_info['user_id']
                g.user_email = user_info['email']
                g.user_name = user_info.get('name', g.user_email)
                logger.info(f"Production mode: Authenticated {g.user_email}")
                
        except Exception as e:
            logger.error(f"Auth error: {e}")
            return jsonify({'error': 'Authentication failed'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function


@preferences_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        db = get_db()
        db.execute(text("SELECT 1"))
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