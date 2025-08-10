from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL connection settings
DB_HOST = os.getenv("POSTGRES_HOST", "gzcdevserver.postgres.database.azure.com")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "gzc_intel")

# Check if running in Azure (managed identity) or local dev
if os.getenv("WEBSITE_SITE_NAME") or os.getenv("CONTAINER_APP_NAME"):
    # Azure Container App - use managed identity
    # For Azure PostgreSQL with managed identity, username should be the app name
    DB_USER = "gzc-intel-application-ac@gzcdevserver"
    # For managed identity, we'll use access token authentication
    try:
        from azure.identity import ManagedIdentityCredential
        import psycopg2
        
        # Get access token for PostgreSQL
        credential = ManagedIdentityCredential()
        token = credential.get_token("https://ossrdbms-aad.database.windows.net")
        
        # Use access token as password
        DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{token.token}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode=require"
    except ImportError:
        # Fallback to password auth if azure-identity not available
        print("WARNING: azure-identity not available, falling back to password auth")
        DB_USER = os.getenv("POSTGRES_USER", "mikael")
        DB_PASS = os.getenv("POSTGRES_PASSWORD", "Ii89rra137+*")
        DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    # Local development - use password authentication
    DB_USER = os.getenv("POSTGRES_USER", "mikael") 
    DB_PASS = os.getenv("POSTGRES_PASSWORD", "Ii89rra137+*")
    DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

print(f"Connecting to PostgreSQL as: {DB_USER.split('@')[0] if '@' in DB_USER else DB_USER}")
engine: Engine = create_engine(DATABASE_URL)
