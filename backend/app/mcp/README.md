# MCP Server Skeleton

This folder hosts the Model Context Protocol (MCP) server scaffolding used to securely broker access to business data.

- `server.py`: Core request/response models and dispatcher.
- `registry.py`: Singleton registry to attach connectors at startup.
- `connectors/`: Implement per-resource adapters (e.g., local files, email).

Example next step: register connectors during FastAPI startup and expose a `/mcp/dispatch` endpoint.

## Example connectors

- `local_files`: read-only access to files under `Settings.mcp_base_path`.
- `email_mbox`: read-only access to a local MBOX file at `Settings.mcp_mbox_path` (list and get).
