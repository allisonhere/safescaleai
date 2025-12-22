from fastapi import APIRouter, Depends

from app.auth import get_current_org
from app.models.compliance import Organization
from app.mcp import mcp_server
from app.mcp.server import MCPRequest, MCPResponse

router = APIRouter(prefix="/mcp", tags=["mcp"])


@router.post("/dispatch", response_model=MCPResponse)
async def dispatch(request: MCPRequest, org: Organization = Depends(get_current_org)) -> MCPResponse:
    _ = org
    return await mcp_server.dispatch(request)
