# Fixed PostgreSQL MCP Server for Cursor IDE

## Problem Solved
The original `@modelcontextprotocol/server-postgres` package was deprecated and had URL parsing issues. I've created a custom PostgreSQL MCP server that works properly.

## What's Fixed

### 1. Custom PostgreSQL MCP Server
- **File**: `postgres-mcp-server.js`
- **Dependencies**: `@modelcontextprotocol/sdk` and `pg`
- **Features**:
  - `query_database` - Execute any SQL query
  - `list_tables` - List tables in any schema
  - `describe_table` - Get table structure and columns
  - `get_table_data` - Get sample data from tables

### 2. Updated Configuration Files
- **`.cursorrules`** - Updated to use custom server
- **`cursor_mcp_config.json`** - Updated configuration
- **`package.json`** - Added dependencies

### 3. Test Script
- **`test-mcp-server.js`** - Verifies database connection
- **Confirmed working**: ✓ Connected to PostgreSQL 16.9
- **Tables found**: 10 in public schema, 300+ in leg schema

## Database Access Confirmed

### Public Schema Tables:
- `bloomberg_tickers`
- `gzc_fx_option_trade` ✓
- `gzc_fx_trade` ✓
- `market_data`
- `ois_curves`
- `portfolios`
- `positions`
- `tblbrokerfx`
- `transactions`
- `user_memory`

### Leg Schema Tables (300+):
- `tblFund` ✓ (for fund data)
- `tblBloombergTicker`
- `tblBond`
- And many more...

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Test Connection
```bash
node test-mcp-server.js
```

### 3. Configure Cursor IDE
1. Open Cursor IDE
2. Go to Settings (Ctrl/Cmd + ,)
3. Search for "MCP" or "Model Context Protocol"
4. Add configuration from `cursor_mcp_config.json`:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "node",
      "args": ["postgres-mcp-server.js"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://mikael:Ii89rra137+*@gzcdevserver.postgres.database.azure.com:5432/gzc_platform?sslmode=require"
      }
    }
  }
}
```

### 4. Restart Cursor IDE

## Available Tools

Once configured, you can ask Cursor's AI:

### Database Queries
- "Show me all tables in the public schema"
- "Describe the structure of gzc_fx_trade table"
- "Get the first 10 records from gzc_fx_option_trade"
- "Query the leg.tblFund table to see fund records"

### Schema Analysis
- "List all tables in the leg schema"
- "Show me the columns in the portfolios table"
- "What's the structure of the bloomberg_tickers table?"

### Data Analysis
- "Count records in gzc_fx_trade by fund"
- "Show me recent FX trades"
- "Analyze the portfolio data structure"

## Troubleshooting

### If MCP Server Doesn't Start
1. Check Node.js version: `node --version` (needs 18+)
2. Install dependencies: `npm install`
3. Test connection: `node test-mcp-server.js`

### If Database Connection Fails
1. Verify PostgreSQL server is accessible
2. Check firewall settings
3. Confirm SSL certificate validity
4. Test with psql client

### If Cursor Doesn't Recognize MCP
1. Ensure JSON syntax is valid
2. Check file paths are correct
3. Restart Cursor IDE after changes
4. Check Cursor IDE logs for errors

## Security Notes
- Database credentials are in configuration
- SSL is required for all connections
- File system access limited to project directory
- Consider environment variables for production

## Next Steps
1. Test with simple database queries in Cursor
2. Explore table structures
3. Use for database schema analysis
4. Leverage for code generation with database context
