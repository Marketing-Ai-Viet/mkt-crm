# MCP PostgreSQL Server Setup Guide

## Overview

This guide explains how to set up and configure the MCP (Model Context Protocol) PostgreSQL server to work with Claude Code for database queries and operations.

## Prerequisites

- Docker installed and running
- PostgreSQL database running (in this project: `twenty_pg` container on port 5432)
- Claude Code CLI installed

## Database Configuration

The project uses the following PostgreSQL configuration (from `packages/twenty-server/.env`):

```
PG_DATABASE_URL=postgres://postgres:postgres@localhost:5432/default
```

**Connection Details:**
- Host: `localhost`
- Port: `5432`
- Username: `postgres`
- Password: `postgres`
- Database: `default`

## Installation Steps

### 1. Pull the MCP PostgreSQL Docker Image

```bash
docker pull mcp/postgres
```

### 2. Remove Existing MCP Server (if any)

```bash
claude mcp remove mcp-postgres
```

### 3. Add MCP PostgreSQL Server

```bash
claude mcp add mcp-postgres -- docker run -i --network=host mcp/postgres postgresql://postgres:postgres@localhost:5432/default
```

**Command Breakdown:**
- `docker run -i`: Run container in interactive mode with stdin open
- `--network=host`: Use host network mode to access localhost services
- `mcp/postgres`: Docker image name
- `postgresql://postgres:postgres@localhost:5432/default`: Database connection URL (passed as argument)

### 4. Verify Connection

```bash
claude mcp list
```

Expected output:
```
mcp-postgres: docker run -i --network=host mcp/postgres postgresql://postgres:postgres@localhost:5432/default - ✓ Connected
```

## Testing MCP Server

You can test the MCP server manually using Docker:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  docker run --rm -i --network=host mcp/postgres \
  postgresql://postgres:postgres@localhost:5432/default
```

Expected response:
```json
{
  "result": {
    "tools": [
      {
        "name": "query",
        "description": "Run a read-only SQL query",
        "inputSchema": {
          "type": "object",
          "properties": {
            "sql": {
              "type": "string"
            }
          }
        }
      }
    ]
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

## Available Tools

The MCP PostgreSQL server provides the following tool:

### `query`
- **Description**: Run a read-only SQL query
- **Input**: SQL query string
- **Use Case**: Query database tables, check schema, analyze data

## Troubleshooting

### Error: "Failed to connect"

**Possible causes:**
1. PostgreSQL is not running
   - Check: `docker ps | grep postgres`
   - Start: `docker start twenty_pg`

2. Wrong network mode
   - Use `--network=host` instead of `--add-host=host.docker.internal:host-gateway`

3. Incorrect database credentials
   - Verify credentials in `packages/twenty-server/.env`

### Error: "Please provide a database URL as a command-line argument"

**Solution:** Pass the DATABASE_URL as the last argument (not as an environment variable):
```bash
# ✗ Wrong
docker run -i -e DATABASE_URL=... mcp/postgres

# ✓ Correct
docker run -i --network=host mcp/postgres postgresql://...
```

### Error: "Exited (1)"

Check container logs:
```bash
docker ps -a | grep mcp/postgres  # Find container ID
docker logs <container_id>
```

## Configuration File

MCP servers are configured in `~/.claude.json`. After running the add command, you should see:

```json
{
  "mcpServers": {
    "mcp-postgres": {
      "command": "docker",
      "args": ["run", "-i", "--network=host", "mcp/postgres", "postgresql://postgres:postgres@localhost:5432/default"]
    }
  }
}
```

## Security Notes

- The MCP PostgreSQL server runs **read-only queries** by default
- Credentials are stored in the local config file (`~/.claude.json`)
- For production use, consider using environment variables or secrets management
- Never commit credentials to version control

## Usage with Claude Code

Once configured, you can ask Claude Code to query the database:

```
claude: "Show me all tables in the database"
claude: "Query the users table and show me the first 10 records"
claude: "What is the schema of the orders table?"
```

Claude Code will automatically use the MCP server to execute these queries.

## References

- [MCP PostgreSQL Server](https://hub.docker.com/r/mcp/postgres)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Claude Code Documentation](https://docs.claude.com/claude-code)

## Project Information

- **Project**: Twenty CRM
- **Database Container**: `twenty_pg` (PostgreSQL 16)
- **Database Port**: 5432
- **Database Name**: `default`