#!/usr/bin/env python3
"""
Script to check the structure of gzc_platform.leg.tblFund table
This will help us understand the actual column names and structure
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DB_CONFIG = {
    "host": os.getenv("POSTGRES_PLATFORM_HOST")
    or os.getenv("POSTGRES_HOST", "gzcdevserver.postgres.database.azure.com"),
    "database": os.getenv("POSTGRES_PLATFORM_DB")
    or os.getenv("POSTGRES_DB", "gzc_platform"),
    "user": os.getenv("POSTGRES_PLATFORM_USER") or os.getenv("POSTGRES_USER", "mikael"),
    "password": os.getenv("POSTGRES_PLATFORM_PASSWORD")
    or os.getenv("POSTGRES_PASSWORD", "Ii89rra137+*"),
    "port": os.getenv("POSTGRES_PLATFORM_PORT") or os.getenv("POSTGRES_PORT", "5432"),
}


def check_tblFund_structure():
    """Check the structure of gzc_platform.leg.tblFund table"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        print("Checking gzc_platform.leg.tblFund table structure...")
        print(f"Connected to: {DB_CONFIG['host']}/{DB_CONFIG['database']}")
        print("-" * 60)

        # Step 1: Check what schemas exist
        cursor.execute("""
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            ORDER BY schema_name;
        """)

        schemas = cursor.fetchall()
        print("Available schemas:")
        for schema in schemas:
            print(f"  {schema['schema_name']}")

        print("\n" + "-" * 60)

        # Step 2: Check what tables exist in leg schema
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'leg'
            ORDER BY table_name;
        """)

        tables = cursor.fetchall()
        print("Tables in 'leg' schema:")
        for table in tables:
            print(f"  {table['table_name']}")

        print("\n" + "-" * 60)

        # Step 3: Get sample data for GMF and GCF
        cursor.execute("""
            SELECT * FROM leg."tblFund"
            WHERE "FundId" IN (1, 6)
            ORDER BY "FundId";
        """)

        sample_data = cursor.fetchall()
        print("Sample Data (GMF=1, GCF=6):")
        for row in sample_data:
            print(f"  {dict(row)}")

        print("\n" + "-" * 60)

        # Step 4: Get all funds
        cursor.execute("""
            SELECT * FROM leg."tblFund"
            ORDER BY "FundId";
        """)

        all_funds = cursor.fetchall()
        print(f"All Funds ({len(all_funds)} total):")
        for fund in all_funds:
            print(f"  {dict(fund)}")

        cursor.close()
        conn.close()

        print("\nSUCCESS: Table structure check completed!")

    except Exception as e:
        print(f"ERROR: Error checking table structure: {e}")


if __name__ == "__main__":
    check_tblFund_structure()
