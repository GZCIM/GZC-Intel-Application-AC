# MCP Server Configuration for GZC Intel Application

## Overview
This configuration sets up Model Context Protocol (MCP) servers to enable Claude to directly interact with your PostgreSQL database and file system.

## Installation

### 1. Install MCP Servers
```bash
# Install PostgreSQL MCP server
npm install -g @modelcontextprotocol/server-postgres

# Install filesystem MCP server
npm install -g @modelcontextprotocol/server-filesystem

# Install memory MCP server
npm install -g @modelcontextprotocol/server-memory

# Install Brave search MCP server (optional)
npm install -g @modelcontextprotocol/server-brave-search
```

### 2. Configure Claude Desktop
Copy the `claude_desktop_config.json` file to your Claude Desktop configuration directory:

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/claude/claude_desktop_config.json
```

## Configuration Details

### PostgreSQL Server
- **Connection**: Direct access to `gzc_platform` database
- **Host**: `gzcdevserver.postgres.database.azure.com`
- **Database**: `gzc_platform`
- **User**: `mikael`
- **SSL**: Required (`sslmode=require`)

### Capabilities Enabled
With this MCP configuration, Claude can:

1. **Query Database Tables**:
   - List all tables in `gzc_platform` database
   - Describe table structures
   - Execute SELECT queries
   - View data from `leg.tblFund`, `fx_trades`, `fx_options_trades`, etc.

2. **File System Access**:
   - Read project files
   - Analyze code structure
   - Access configuration files
   - Review documentation

3. **Memory Persistence**:
   - Remember context across conversations
   - Store project-specific information
   - Maintain state between sessions

## Usage Examples

Once configured, you can ask Claude:

```
"Show me all tables in the gzc_platform database"
"Query the leg.tblFund table to see all fund records"
"Describe the structure of the fx_trades table"
"Show me the first 10 records from fx_options_trades"
"Create a new table for trade lineage tracking"
```

## Security Notes

- The PostgreSQL connection uses password authentication
- SSL is required for all connections
- File system access is limited to the project directory
- Consider using environment variables for sensitive data in production

## Troubleshooting

### Connection Issues
1. Verify PostgreSQL server is accessible
2. Check firewall settings
3. Confirm SSL certificate validity
4. Test connection with psql client

### MCP Server Issues
1. Ensure Node.js and npm are installed
2. Check MCP server installation
3. Verify configuration file location
4. Restart Claude Desktop after configuration changes

## Environment Variables

For production deployment, consider using environment variables:

```bash
export POSTGRES_HOST="your-production-host"
export POSTGRES_USER="your-production-user"
export POSTGRES_PASSWORD="your-production-password"
export POSTGRES_DB="your-production-database"
```

Then update the connection string in the config file accordingly.

