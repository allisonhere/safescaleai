from typing import Any, Protocol

from pydantic import BaseModel


class MCPRequest(BaseModel):
    resource: str
    action: str
    payload: dict[str, Any] | None = None


class MCPResponse(BaseModel):
    ok: bool
    data: dict[str, Any] | None = None
    error: str | None = None


class MCPConnector(Protocol):
    name: str

    async def handle(self, request: MCPRequest) -> MCPResponse:  # pragma: no cover - interface
        ...


class MCPServer:
    def __init__(self) -> None:
        self._connectors: dict[str, MCPConnector] = {}

    def register(self, connector: MCPConnector) -> None:
        self._connectors[connector.name] = connector

    async def dispatch(self, request: MCPRequest) -> MCPResponse:
        connector = self._connectors.get(request.resource)
        if not connector:
            return MCPResponse(ok=False, error=f"Unknown resource: {request.resource}")
        return await connector.handle(request)
