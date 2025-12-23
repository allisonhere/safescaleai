import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.audit import router as audit_router
from app.api.auth import router as auth_router
from app.api.billing import router as billing_router
from app.api.debug import router as debug_router
from app.api.dashboard import router as dashboard_router
from app.api.health import router as health_router
from app.api.admin import router as admin_router
from app.api.mcp import router as mcp_router
from app.api.policy_audit import router as policy_audit_router
from app.api.scan import router as scan_router
from app.api.scraper import router as scraper_router
from app.core.config import settings
from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models.compliance import Organization
from app.mcp import mcp_server
from app.mcp.connectors.email_mbox import EmailMboxConnector
from app.mcp.connectors.local_files import LocalFilesConnector
from app.services.scraper import scraper_loop

logger = logging.getLogger("safescale")


@asynccontextmanager
async def lifespan(app: FastAPI):
    mcp_server.register(LocalFilesConnector(Path(settings.mcp_base_path)))
    mcp_server.register(EmailMboxConnector(Path(settings.mcp_mbox_path)))
    if settings.scraper_enabled:
        org_id = None
        if settings.scraper_org_api_key:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(Organization).where(Organization.api_key == settings.scraper_org_api_key)
                )
                org = result.scalar_one_or_none()
                org_id = org.id if org else None
        if org_id:
            task = asyncio.create_task(
                scraper_loop(
                    AsyncSessionLocal,
                    settings.scraper_urls,
                    org_id,
                )
            )
            yield
            task.cancel()
        else:
            yield
    else:
        yield


app = FastAPI(title="SafeScale AI Backend", version="0.1.0", lifespan=lifespan)
logging.basicConfig(level=logging.INFO)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception", extra={"path": request.url.path, "method": request.method})
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(audit_router)
app.include_router(dashboard_router)
app.include_router(scraper_router)
app.include_router(policy_audit_router)
app.include_router(billing_router)
app.include_router(scan_router)
app.include_router(mcp_router)
app.include_router(admin_router)
app.include_router(debug_router)
