from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
import os
from dotenv import load_dotenv

load_dotenv()
DB_USER = os.getenv("DB_USER", "your_user")
DB_PASS = os.getenv("DB_PASSWORD", "your_password")
DB_HOST = os.getenv("DB_URL", "yourserver.database.windows.net")
DB_NAME = os.getenv("DB_NAME", "your_db")

DATABASE_URL = (
    f"mssql+pyodbc://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}"
    "?driver=ODBC+Driver+17+for+SQL+Server"
)

engine: Engine = create_engine(DATABASE_URL)
