# MCP Configuration Guide

## Current Status

### Working MCP Servers
- **chrome-devtools**: Configured and working (for browser automation/testing)

### Issue: MongoDB MCP Server

The MongoDB MCP server is configured in your global Cursor settings (`~/.cursor/mcp.json`) but is failing due to a dependency issue with the `bson` package.

**Error:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'bson/lib/bson.node.mjs'
```

**Root Cause:** The `mongodb-mcp-server@latest` package has a compatibility issue with newer versions of the `bson` package when run via `npx`.

## Recommendation

**Remove the MongoDB MCP server** from your Cursor MCP configuration because:

1. This project uses **PostgreSQL** (production) and **SQLite** (local dev), not MongoDB
2. The MongoDB MCP server is not needed for this codebase
3. It's causing startup errors that clutter your logs

## How to Fix

1. Open Cursor Settings (Ctrl+, or Cmd+,)
2. Search for "MCP" or navigate to Model Context Protocol settings
3. Find the MongoDB MCP server entry
4. Remove or disable it
5. Restart Cursor

## Project MCP Configuration

The project includes these MCP configuration files (for reference):
- `.mcp.json` - Chrome DevTools MCP server
- `mcpchrome.json` - Chrome DevTools MCP server (duplicate)

These are correct and should remain.

## Database Configuration

The project uses:
- **Local Development**: SQLite at `data/ecommerce.sqlite` (project root)
- **Production**: PostgreSQL (configured via environment variables)

Database path has been standardized to resolve consistently from the project root.

