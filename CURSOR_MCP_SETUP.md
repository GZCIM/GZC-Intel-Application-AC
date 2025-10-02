# Cursor IDE MCP Configuration for GZC Intel Application

## Overview
This configuration enables Cursor IDE to use Model Context Protocol (MCP) servers for direct database access and enhanced AI capabilities.

## Setup Instructions

### 1. Install MCP Servers
Run these commands in your terminal:

```bash
# Install PostgreSQL MCP server
npm install -g @modelcontextprotocol/server-postgres

# Install filesystem MCP server
npm install -g @modelcontextprotocol/server-filesystem

# Install memory MCP server
npm install -g @modelcontextprotocol/server-memory
```

### 2. Configure Cursor IDE

#### Option A: Using Cursor Settings UI
1. Open Cursor IDE
2. Go to Settings (Ctrl/Cmd + ,)
3. Search for "MCP" or "Model Context Protocol"
4. Add the configuration from `cursor_mcp_config.json`

#### Option B: Manual Configuration
1. Open Cursor IDE
2. Press `Ctrl/Cmd + Shift + P`
3. Type "Preferences: Open Settings (JSON)"
4. Add the MCP configuration:

```json
{
  "mcp.servers": {
    "postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://mikael:Ii89rra137+*@gzcdevserver.postgres.database.azure.com:5432/gzc_platform?sslmode=require"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-filesystem",
        "C:\\repo\\GZC-Intel-Application-AC"
      ]
    },
    "memory": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-memory"]
    }
  }
}
```

### 3. Restart Cursor IDE
After configuration, restart Cursor IDE to load the MCP servers.

## Capabilities Enabled

With this MCP configuration, Cursor's AI can:

### Database Operations
- **Query Tables**: Direct access to `gzc_platform` database
- **Table Structure**: Describe table schemas and relationships
- **Data Analysis**: Query and analyze trade data
- **Schema Management**: Create/modify database structures

### File System Access
- **Code Analysis**: Read and understand your entire codebase
- **Configuration Files**: Access environment files, Docker configs
- **Documentation**: Read and update project documentation

### Memory Persistence
- **Context Retention**: Remember project-specific information
- **Session State**: Maintain context across conversations
- **Project Knowledge**: Build understanding of your application

## Usage Examples

Once configured, you can ask Cursor's AI:

```
"Show me all tables in the gzc_platform database"
"Query the leg.tblFund table to see fund records"
"Describe the structure of the fx_trades table"
"Create a migration script for the new gzc_fund table"
"Analyze the database schema and suggest optimizations"
"Show me the first 10 records from fx_options_trades"
```

## Database Connection Details

- **Host**: `gzcdevserver.postgres.database.azure.com`
- **Database**: `gzc_platform`
- **User**: `mikael`
- **SSL**: Required (`sslmode=require`)
- **Port**: `5432`

## Troubleshooting

### MCP Server Not Working
1. Verify Node.js and npm are installed
2. Check MCP server installation: `npm list -g @modelcontextprotocol/server-postgres`
3. Test database connection manually
4. Check Cursor IDE logs for errors

### Database Connection Issues
1. Verify PostgreSQL server is accessible
2. Check firewall settings
3. Confirm SSL certificate validity
4. Test connection with psql client

### Configuration Issues
1. Ensure JSON syntax is valid
2. Check file paths are correct
3. Verify environment variables
4. Restart Cursor IDE after changes

## Security Notes

- Database credentials are embedded in configuration
- Consider using environment variables for production
- File system access is limited to project directory
- SSL is required for all database connections

## Next Steps

After setup:
1. Test with simple database queries
2. Explore table structures
3. Use for database schema analysis
4. Leverage for code generation with database context
