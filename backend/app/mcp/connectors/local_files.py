from pathlib import Path

from app.mcp.server import MCPRequest, MCPResponse


class LocalFilesConnector:
    name = "local_files"

    def __init__(self, base_path: Path) -> None:
        self.base_path = base_path

    async def handle(self, request: MCPRequest) -> MCPResponse:
        if request.action != "read" or not request.payload:
            return MCPResponse(ok=False, error="Unsupported action")

        relative_path = request.payload.get("path")
        if not relative_path:
            return MCPResponse(ok=False, error="Missing path")

        target = (self.base_path / relative_path).resolve()
        if not str(target).startswith(str(self.base_path.resolve())):
            return MCPResponse(ok=False, error="Access denied")

        if not target.exists() or not target.is_file():
            return MCPResponse(ok=False, error="File not found")

        return MCPResponse(ok=True, data={"content": target.read_text(encoding="utf-8")})
