-- Create user_memory table for PostgreSQL
CREATE TABLE IF NOT EXISTS user_memory (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    memory_type VARCHAR(100) NOT NULL,
    memory_key VARCHAR(255) NOT NULL,
    memory_data TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, tenant_id, memory_type, memory_key)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_memory_lookup 
ON user_memory(user_id, tenant_id, memory_type, memory_key);

-- Create index on timestamps for maintenance queries
CREATE INDEX IF NOT EXISTS idx_user_memory_timestamps 
ON user_memory(created_at, updated_at);