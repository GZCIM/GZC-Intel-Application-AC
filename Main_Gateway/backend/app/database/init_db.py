"""Initialize database tables for user memory storage"""
from sqlalchemy import text
from app.database.connection import engine
from app.util.logger import get_logger

logger = get_logger(__name__)

def create_tables():
    """Create necessary database tables if they don't exist"""
    try:
        with engine.connect() as conn:
            # Create user_memory table
            conn.execute(text("""
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
                )
            """))
            
            # Create indexes
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_user_memory_lookup 
                ON user_memory(user_id, tenant_id, memory_type, memory_key)
            """))
            
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_user_memory_timestamps 
                ON user_memory(created_at, updated_at)
            """))
            
            conn.commit()
            logger.info("Database tables initialized successfully")
            return True
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}")
        return False

if __name__ == "__main__":
    if create_tables():
        print("Database initialization completed successfully")
    else:
        print("Database initialization failed")