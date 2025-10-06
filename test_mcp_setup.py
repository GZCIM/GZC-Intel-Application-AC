#!/usr/bin/env python3
"""
MCP Server Test Script for GZC Intel Application
Tests the MCP server configuration and database connectivity
"""

import subprocess
import json
import os
import sys
from pathlib import Path


def test_mcp_installation():
    """Test if MCP servers are installed"""
    print("🔍 Testing MCP Server Installation...")

    servers = [
        "@modelcontextprotocol/server-postgres",
        "@modelcontextprotocol/server-filesystem",
        "@modelcontextprotocol/server-memory",
    ]

    for server in servers:
        try:
            result = subprocess.run(
                ["npm", "list", "-g", server],
                capture_output=True,
                text=True,
                check=True,
            )
            print(f"SUCCESS: {server} - Installed")
        except subprocess.CalledProcessError:
            print(f"ERROR: {server} - Not installed")
            return False

    return True


def test_database_connection():
    """Test PostgreSQL database connection"""
    print("\n🔍 Testing Database Connection...")

    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor

        # Database configuration
        DB_CONFIG = {
            "host": "gzcdevserver.postgres.database.azure.com",
            "database": "gzc_platform",
            "user": "mikael",
            "password": "Ii89rra137+*",
            "port": "5432",
            "sslmode": "require",
        }

        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Test basic query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✅ Database connected - PostgreSQL {version['version']}")

        # Test table access
        cursor.execute("""
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_schema IN ('public', 'leg')
            ORDER BY table_schema, table_name;
        """)

        tables = cursor.fetchall()
        print(f"✅ Found {len(tables)} tables in database")

        # Show key tables
        key_tables = [
            t
            for t in tables
            if any(
                name in t["table_name"].lower()
                for name in ["fund", "fx", "trade", "option"]
            )
        ]

        if key_tables:
            print("📋 Key tables found:")
            for table in key_tables[:10]:  # Show first 10
                print(f"   {table['table_schema']}.{table['table_name']}")

        cursor.close()
        conn.close()
        return True

    except ImportError:
        print("❌ psycopg2 not installed. Run: pip install psycopg2-binary")
        return False
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


def create_mcp_config():
    """Create MCP configuration file"""
    print("\n🔍 Creating MCP Configuration...")

    config = {
        "mcpServers": {
            "postgres": {
                "command": "npx",
                "args": ["@modelcontextprotocol/server-postgres"],
                "env": {
                    "POSTGRES_CONNECTION_STRING": "postgresql://mikael:Ii89rra137+*@gzcdevserver.postgres.database.azure.com:5432/gzc_platform?sslmode=require"
                },
            },
            "filesystem": {
                "command": "npx",
                "args": ["@modelcontextprotocol/server-filesystem", str(Path.cwd())],
            },
            "memory": {
                "command": "npx",
                "args": ["@modelcontextprotocol/server-memory"],
            },
        }
    }

    config_file = Path("claude_desktop_config.json")
    with open(config_file, "w") as f:
        json.dump(config, f, indent=2)

    print(f"✅ Configuration created: {config_file}")

    # Show installation instructions
    print("\n📋 Next Steps:")
    print("1. Install MCP servers:")
    print("   npm install -g @modelcontextprotocol/server-postgres")
    print("   npm install -g @modelcontextprotocol/server-filesystem")
    print("   npm install -g @modelcontextprotocol/server-memory")
    print("\n2. Copy config to Claude Desktop:")

    if sys.platform == "win32":
        config_path = "%APPDATA%\\Claude\\claude_desktop_config.json"
    elif sys.platform == "darwin":
        config_path = "~/Library/Application Support/Claude/claude_desktop_config.json"
    else:
        config_path = "~/.config/claude/claude_desktop_config.json"

    print(f"   Copy {config_file} to {config_path}")
    print("\n3. Restart Claude Desktop")
    print("\n4. Test with queries like:")
    print("   'Show me all tables in the database'")
    print("   'Query the leg.tblFund table'")


def main():
    """Main test function"""
    print("MCP Server Test for GZC Intel Application")
    print("=" * 50)

    # Test installations
    mcp_ok = test_mcp_installation()

    # Test database
    db_ok = test_database_connection()

    # Create config
    create_mcp_config()

    print("\n" + "=" * 50)
    if mcp_ok and db_ok:
        print("SUCCESS: All tests passed! MCP server ready for configuration.")
    else:
        print("WARNING: Some tests failed. Check the output above for issues.")

    print("\nSee MCP_SETUP_GUIDE.md for detailed instructions.")


if __name__ == "__main__":
    main()
