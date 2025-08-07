"""
User Preferences Model
Stores user-specific settings, tab configurations, and component layouts
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
from sqlalchemy import Column, String, JSON, DateTime, Text, Integer, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class UserPreferences(Base):
    """Main user preferences table"""
    __tablename__ = 'user_preferences'
    
    # Primary key - Azure AD user ID
    user_id = Column(String(128), primary_key=True)
    email = Column(String(255), nullable=False)
    display_name = Column(String(255))
    
    # Theme and display preferences
    theme = Column(String(50), default='dark')
    language = Column(String(10), default='en')
    timezone = Column(String(50), default='UTC')
    
    # Layout preferences
    default_layout = Column(String(50), default='grid')
    sidebar_collapsed = Column(Boolean, default=False)
    
    # Component preferences
    favorite_components = Column(JSON, default=list)
    hidden_components = Column(JSON, default=list)
    
    # Global settings
    notification_settings = Column(JSON, default=dict)
    trading_preferences = Column(JSON, default=dict)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    tabs = relationship("TabConfiguration", back_populates="user", cascade="all, delete-orphan")
    layouts = relationship("ComponentLayout", back_populates="user", cascade="all, delete-orphan")
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'user_id': self.user_id,
            'email': self.email,
            'display_name': self.display_name,
            'theme': self.theme,
            'language': self.language,
            'timezone': self.timezone,
            'default_layout': self.default_layout,
            'sidebar_collapsed': self.sidebar_collapsed,
            'favorite_components': self.favorite_components,
            'hidden_components': self.hidden_components,
            'notification_settings': self.notification_settings,
            'trading_preferences': self.trading_preferences,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


class TabConfiguration(Base):
    """Stores user's tab configurations"""
    __tablename__ = 'tab_configurations'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(128), ForeignKey('user_preferences.user_id'), nullable=False)
    
    # Tab properties
    tab_id = Column(String(128), nullable=False)
    title = Column(String(255), nullable=False)
    icon = Column(String(50))
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_pinned = Column(Boolean, default=False)
    
    # Tab type and content
    tab_type = Column(String(50), default='custom')  # custom, system, template
    component_ids = Column(JSON, default=list)  # List of component IDs in this tab
    layout_config = Column(JSON, default=dict)  # Grid/flex layout configuration
    
    # Tab-specific settings
    refresh_interval = Column(Integer)  # in seconds, null = no auto-refresh
    filters = Column(JSON, default=dict)
    custom_settings = Column(JSON, default=dict)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("UserPreferences", back_populates="tabs")
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'tab_id': self.tab_id,
            'title': self.title,
            'icon': self.icon,
            'order_index': self.order_index,
            'is_active': self.is_active,
            'is_pinned': self.is_pinned,
            'tab_type': self.tab_type,
            'component_ids': self.component_ids,
            'layout_config': self.layout_config,
            'refresh_interval': self.refresh_interval,
            'filters': self.filters,
            'custom_settings': self.custom_settings,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class ComponentLayout(Base):
    """Stores component positions and sizes within tabs"""
    __tablename__ = 'component_layouts'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(128), ForeignKey('user_preferences.user_id'), nullable=False)
    tab_id = Column(String(128), nullable=False)
    
    # Component identification
    component_id = Column(String(128), nullable=False)
    component_type = Column(String(100), nullable=False)
    
    # Position and size (for grid layout)
    grid_x = Column(Integer, default=0)
    grid_y = Column(Integer, default=0)
    grid_width = Column(Integer, default=4)
    grid_height = Column(Integer, default=4)
    
    # Component state
    is_minimized = Column(Boolean, default=False)
    is_maximized = Column(Boolean, default=False)
    is_visible = Column(Boolean, default=True)
    z_index = Column(Integer, default=0)
    
    # Component-specific configuration
    component_config = Column(JSON, default=dict)  # Props, settings, etc.
    data_source = Column(JSON, default=dict)  # API endpoints, subscriptions
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("UserPreferences", back_populates="layouts")
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'tab_id': self.tab_id,
            'component_id': self.component_id,
            'component_type': self.component_type,
            'grid_x': self.grid_x,
            'grid_y': self.grid_y,
            'grid_width': self.grid_width,
            'grid_height': self.grid_height,
            'is_minimized': self.is_minimized,
            'is_maximized': self.is_maximized,
            'is_visible': self.is_visible,
            'z_index': self.z_index,
            'component_config': self.component_config,
            'data_source': self.data_source,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }