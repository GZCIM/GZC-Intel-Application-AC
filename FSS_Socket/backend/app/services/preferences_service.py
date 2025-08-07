"""
User Preferences Service
Handles all user preference operations with proper error handling and caching
"""
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.models.user_preferences import UserPreferences, TabConfiguration, ComponentLayout
from app.dao.redis_dao import RedisDAO

logger = logging.getLogger(__name__)

class PreferencesService:
    """Service layer for user preferences management"""
    
    def __init__(self, db_session: Session, redis_dao: Optional[RedisDAO] = None):
        self.db = db_session
        self.redis = redis_dao
        self.cache_ttl = 3600  # 1 hour cache
        
    def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user preferences with caching"""
        try:
            # Try cache first
            if self.redis:
                cache_key = f"user_prefs:{user_id}"
                cached = self._get_from_cache(cache_key)
                if cached:
                    logger.debug(f"Retrieved preferences from cache for user {user_id}")
                    return cached
            
            # Query database
            user_prefs = self.db.query(UserPreferences).filter_by(user_id=user_id).first()
            
            if not user_prefs:
                logger.info(f"No preferences found for user {user_id}")
                return None
                
            # Build complete response with related data
            result = user_prefs.to_dict()
            result['tabs'] = [tab.to_dict() for tab in user_prefs.tabs]
            result['layouts'] = [layout.to_dict() for layout in user_prefs.layouts]
            
            # Cache the result
            if self.redis:
                self._set_cache(cache_key, result, self.cache_ttl)
                
            return result
            
        except SQLAlchemyError as e:
            logger.error(f"Database error getting preferences for user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting preferences: {e}")
            raise
    
    def create_or_update_preferences(self, user_id: str, email: str, 
                                    preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update user preferences"""
        try:
            user_prefs = self.db.query(UserPreferences).filter_by(user_id=user_id).first()
            
            if not user_prefs:
                # Create new preferences
                user_prefs = UserPreferences(
                    user_id=user_id,
                    email=email,
                    display_name=preferences.get('display_name', email.split('@')[0])
                )
                self.db.add(user_prefs)
                logger.info(f"Creating new preferences for user {user_id}")
            else:
                logger.info(f"Updating preferences for user {user_id}")
            
            # Update fields
            updatable_fields = [
                'theme', 'language', 'timezone', 'default_layout',
                'sidebar_collapsed', 'favorite_components', 'hidden_components',
                'notification_settings', 'trading_preferences'
            ]
            
            for field in updatable_fields:
                if field in preferences:
                    setattr(user_prefs, field, preferences[field])
            
            user_prefs.updated_at = datetime.utcnow()
            self.db.commit()
            
            # Invalidate cache
            if self.redis:
                cache_key = f"user_prefs:{user_id}"
                self._delete_from_cache(cache_key)
            
            return self.get_user_preferences(user_id)
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error updating preferences: {e}")
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error updating preferences: {e}")
            raise
    
    def save_tab_configuration(self, user_id: str, tab_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save or update a tab configuration"""
        try:
            tab_id = tab_data.get('tab_id')
            
            if not tab_id:
                raise ValueError("tab_id is required")
            
            # Check if tab exists
            tab_config = self.db.query(TabConfiguration).filter_by(
                user_id=user_id, 
                tab_id=tab_id
            ).first()
            
            if not tab_config:
                # Create new tab
                tab_config = TabConfiguration(
                    user_id=user_id,
                    tab_id=tab_id,
                    title=tab_data.get('title', 'New Tab')
                )
                self.db.add(tab_config)
                logger.info(f"Creating new tab {tab_id} for user {user_id}")
            else:
                logger.info(f"Updating tab {tab_id} for user {user_id}")
            
            # Update fields
            updatable_fields = [
                'title', 'icon', 'order_index', 'is_active', 'is_pinned',
                'tab_type', 'component_ids', 'layout_config', 'refresh_interval',
                'filters', 'custom_settings'
            ]
            
            for field in updatable_fields:
                if field in tab_data:
                    setattr(tab_config, field, tab_data[field])
            
            tab_config.updated_at = datetime.utcnow()
            self.db.commit()
            
            # Invalidate cache
            if self.redis:
                self._invalidate_user_cache(user_id)
            
            return tab_config.to_dict()
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error saving tab configuration: {e}")
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error saving tab: {e}")
            raise
    
    def save_component_layout(self, user_id: str, layout_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save or update component layout"""
        try:
            component_id = layout_data.get('component_id')
            tab_id = layout_data.get('tab_id')
            
            if not component_id or not tab_id:
                raise ValueError("component_id and tab_id are required")
            
            # Check if layout exists
            layout = self.db.query(ComponentLayout).filter_by(
                user_id=user_id,
                tab_id=tab_id,
                component_id=component_id
            ).first()
            
            if not layout:
                # Create new layout
                layout = ComponentLayout(
                    user_id=user_id,
                    tab_id=tab_id,
                    component_id=component_id,
                    component_type=layout_data.get('component_type', 'unknown')
                )
                self.db.add(layout)
                logger.info(f"Creating new layout for component {component_id}")
            else:
                logger.info(f"Updating layout for component {component_id}")
            
            # Update fields
            updatable_fields = [
                'component_type', 'grid_x', 'grid_y', 'grid_width', 'grid_height',
                'is_minimized', 'is_maximized', 'is_visible', 'z_index',
                'component_config', 'data_source'
            ]
            
            for field in updatable_fields:
                if field in layout_data:
                    setattr(layout, field, layout_data[field])
            
            layout.updated_at = datetime.utcnow()
            self.db.commit()
            
            # Invalidate cache
            if self.redis:
                self._invalidate_user_cache(user_id)
            
            return layout.to_dict()
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error saving component layout: {e}")
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error saving layout: {e}")
            raise
    
    def delete_tab(self, user_id: str, tab_id: str) -> bool:
        """Delete a tab and its associated layouts"""
        try:
            # Delete tab
            tab = self.db.query(TabConfiguration).filter_by(
                user_id=user_id,
                tab_id=tab_id
            ).first()
            
            if not tab:
                logger.warning(f"Tab {tab_id} not found for user {user_id}")
                return False
            
            # Delete associated layouts
            self.db.query(ComponentLayout).filter_by(
                user_id=user_id,
                tab_id=tab_id
            ).delete()
            
            self.db.delete(tab)
            self.db.commit()
            
            # Invalidate cache
            if self.redis:
                self._invalidate_user_cache(user_id)
            
            logger.info(f"Deleted tab {tab_id} for user {user_id}")
            return True
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error deleting tab: {e}")
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error deleting tab: {e}")
            raise
    
    def bulk_save_layouts(self, user_id: str, tab_id: str, 
                         layouts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Bulk save multiple component layouts"""
        try:
            # Delete existing layouts for this tab
            self.db.query(ComponentLayout).filter_by(
                user_id=user_id,
                tab_id=tab_id
            ).delete()
            
            # Create new layouts
            saved_layouts = []
            for layout_data in layouts:
                layout = ComponentLayout(
                    user_id=user_id,
                    tab_id=tab_id,
                    **layout_data
                )
                self.db.add(layout)
                saved_layouts.append(layout)
            
            self.db.commit()
            
            # Invalidate cache
            if self.redis:
                self._invalidate_user_cache(user_id)
            
            return [layout.to_dict() for layout in saved_layouts]
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error bulk saving layouts: {e}")
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error bulk saving: {e}")
            raise
    
    # Cache helper methods
    def _get_from_cache(self, key: str) -> Optional[Dict]:
        """Get data from Redis cache"""
        try:
            if not self.redis:
                return None
            data = self.redis.redis.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            return None
    
    def _set_cache(self, key: str, data: Dict, ttl: int):
        """Set data in Redis cache"""
        try:
            if not self.redis:
                return
            self.redis.redis.setex(key, ttl, json.dumps(data))
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
    
    def _delete_from_cache(self, key: str):
        """Delete from Redis cache"""
        try:
            if not self.redis:
                return
            self.redis.redis.delete(key)
        except Exception as e:
            logger.warning(f"Cache delete error: {e}")
    
    def _invalidate_user_cache(self, user_id: str):
        """Invalidate all cache entries for a user"""
        cache_key = f"user_prefs:{user_id}"
        self._delete_from_cache(cache_key)