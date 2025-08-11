from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL connection settings
DB_HOST = os.getenv("POSTGRES_HOST", "gzcdevserver.postgres.database.azure.com")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "gzc_intel")

# Always use password authentication for now (until managed identity is configured)
DB_USER = os.getenv("POSTGRES_USER", "mikael") 
DB_PASS = os.getenv("POSTGRES_PASSWORD", "Ii89rra137+*")
DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

print(f"Connecting to PostgreSQL as: {DB_USER.split('@')[0] if '@' in DB_USER else DB_USER}")
engine: Engine = create_engine(DATABASE_URL)
