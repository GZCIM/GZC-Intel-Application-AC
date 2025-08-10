-- User Memory Schema for SQL Server
-- Phase 1: Foundation Database Schema

-- User memory master table
CREATE TABLE user_memory (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id NVARCHAR(255) NOT NULL,
    tenant_id NVARCHAR(255) NOT NULL,
    memory_type NVARCHAR(50) NOT NULL, -- 'layout', 'theme', 'component_state', 'preferences'
    memory_key NVARCHAR(255) NOT NULL, -- tab_id, component_id, etc.
    memory_data NVARCHAR(MAX) NOT NULL, -- JSON data stored as NVARCHAR(MAX)
    version INT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    expires_at DATETIME2 NULL, -- Optional TTL
    
    CONSTRAINT UQ_user_memory_unique UNIQUE(user_id, tenant_id, memory_type, memory_key)
);

-- Indexes for performance
CREATE INDEX IX_user_memory_user ON user_memory(user_id, tenant_id);
CREATE INDEX IX_user_memory_type ON user_memory(user_id, memory_type);
CREATE INDEX IX_user_memory_updated ON user_memory(updated_at);

-- User preferences table  
CREATE TABLE user_preferences (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id NVARCHAR(255) NOT NULL,
    tenant_id NVARCHAR(255) NOT NULL,
    preference_key NVARCHAR(255) NOT NULL,
    preference_value NVARCHAR(MAX) NOT NULL, -- JSON data
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT UQ_user_preferences_unique UNIQUE(user_id, tenant_id, preference_key)
);

-- User sessions for cross-device sync
CREATE TABLE user_sessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id NVARCHAR(255) NOT NULL,
    tenant_id NVARCHAR(255) NOT NULL,
    session_id NVARCHAR(255) NOT NULL,
    device_info NVARCHAR(MAX), -- JSON data
    last_activity DATETIME2 DEFAULT GETDATE(),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Index for sessions
CREATE INDEX IX_user_sessions_user ON user_sessions(user_id, tenant_id);
CREATE INDEX IX_user_sessions_activity ON user_sessions(last_activity);