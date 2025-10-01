from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL connection settings (prefer PLATFORM_*, then STAGING_*, then defaults)
DB_HOST = (
    os.getenv("POSTGRES_PLATFORM_HOST")
    or os.getenv("POSTGRES_STAGING_HOST")
    or os.getenv("POSTGRES_HOST", "gzcdevserver.postgres.database.azure.com")
)
DB_PORT = (
    os.getenv("POSTGRES_PLATFORM_PORT")
    or os.getenv("POSTGRES_STAGING_PORT")
    or os.getenv("POSTGRES_PORT", "5432")
)
DB_NAME = (
    os.getenv("POSTGRES_PLATFORM_DB")
    or os.getenv("POSTGRES_STAGING_DB")
    or os.getenv("POSTGRES_DB", "gzc_platform")
)

# Always use password authentication for now (until managed identity is configured)
DB_USER = (
    os.getenv("POSTGRES_PLATFORM_USER")
    or os.getenv("POSTGRES_STAGING_USER")
    or os.getenv("POSTGRES_USER", "mikael")
)
DB_PASS = (
    os.getenv("POSTGRES_PLATFORM_PASSWORD")
    or os.getenv("POSTGRES_STAGING_PASSWORD")
    or os.getenv("POSTGRES_PASSWORD", "Ii89rra137+*")
)
DB_SSLMODE = os.getenv("POSTGRES_SSLMODE", "require")
ssl_query = f"?sslmode={DB_SSLMODE}" if DB_SSLMODE else ""
DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}{ssl_query}"

print(
    f"Connecting to PostgreSQL as: {DB_USER.split('@')[0] if '@' in DB_USER else DB_USER}"
)
engine: Engine = create_engine(DATABASE_URL)
