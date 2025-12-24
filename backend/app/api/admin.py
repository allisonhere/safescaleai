import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_org
from app.core.config import settings
from app.db import get_session
from app.models.audit import AuditLog
from app.models.compliance import (
    AppSetting,
    ChecklistItem,
    ComplianceScore,
    Organization,
    PolicyAudit,
    RegulatoryAlert,
    ScraperRun,
    UsageEvent,
)
from app.services.checklist import reset_checklist
from app.services.settings import get_embedding_threshold, get_industry_setting, set_setting

router = APIRouter(prefix="/admin", tags=["admin"])

admin_token_header = APIKeyHeader(name="X-Admin-Token", auto_error=False)


class EmbeddingThreshold(BaseModel):
    value: float = Field(ge=0.0, le=1.0)


class IndustrySetting(BaseModel):
    value: str = Field(min_length=2, max_length=80)


class OrgCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)


class OrgCreated(BaseModel):
    id: int
    name: str
    api_key: str
    created_at: datetime


class OrgApiKey(BaseModel):
    api_key: str


class ChecklistResetResponse(BaseModel):
    items: int


class OrgResetResponse(BaseModel):
    audits: int
    alerts: int
    scores: int
    usage_events: int
    scraper_runs: int
    audit_logs: int
    settings: int
    checklists_cleared: int
    checklist_seeded: int


async def require_admin_token(
    token: str | None = Security(admin_token_header),
) -> None:
    if not settings.admin_bootstrap_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin bootstrap disabled",
        )
    if not token or token != settings.admin_bootstrap_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token",
        )


async def _generate_api_key(session: AsyncSession) -> str:
    while True:
        api_key = secrets.token_urlsafe(32)
        result = await session.execute(
            select(Organization).where(Organization.api_key == api_key)
        )
        if result.scalar_one_or_none() is None:
            return api_key


@router.post("/orgs", response_model=OrgCreated, dependencies=[Depends(require_admin_token)])
async def create_org(
    payload: OrgCreate,
    session: AsyncSession = Depends(get_session),
) -> OrgCreated:
    api_key = await _generate_api_key(session)
    org = Organization(name=payload.name, api_key=api_key)
    session.add(org)
    await session.commit()
    await session.refresh(org)
    return OrgCreated(
        id=org.id,
        name=org.name,
        api_key=org.api_key,
        created_at=org.created_at,
    )


@router.post("/orgs/rotate-key", response_model=OrgApiKey)
async def rotate_org_key(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> OrgApiKey:
    api_key = await _generate_api_key(session)
    org.api_key = api_key
    session.add(org)
    await session.commit()
    return OrgApiKey(api_key=api_key)


@router.post("/checklist/reset", response_model=ChecklistResetResponse)
async def reset_org_checklist(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> ChecklistResetResponse:
    items = await reset_checklist(session, org.id)
    return ChecklistResetResponse(items=len(items))


@router.get("/embeddings/threshold", response_model=EmbeddingThreshold)
async def read_embedding_threshold(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> EmbeddingThreshold:
    value = await get_embedding_threshold(session, org.id)
    return EmbeddingThreshold(value=value)


@router.put("/embeddings/threshold", response_model=EmbeddingThreshold)
async def update_embedding_threshold(
    payload: EmbeddingThreshold,
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> EmbeddingThreshold:
    await set_setting(session, org.id, "embedding_similarity_threshold", str(payload.value))
    return EmbeddingThreshold(value=payload.value)


@router.get("/industry", response_model=IndustrySetting)
async def read_industry_setting(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> IndustrySetting:
    value = await get_industry_setting(session, org.id)
    return IndustrySetting(value=value)


@router.put("/industry", response_model=IndustrySetting)
async def update_industry_setting(
    payload: IndustrySetting,
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> IndustrySetting:
    await set_setting(session, org.id, "industry", payload.value)
    return IndustrySetting(value=payload.value)


@router.post("/org/reset", response_model=OrgResetResponse)
async def reset_org_data(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> OrgResetResponse:
    audits = await session.execute(delete(PolicyAudit).where(PolicyAudit.org_id == org.id))
    alerts = await session.execute(delete(RegulatoryAlert).where(RegulatoryAlert.org_id == org.id))
    scores = await session.execute(delete(ComplianceScore).where(ComplianceScore.org_id == org.id))
    usage_events = await session.execute(delete(UsageEvent).where(UsageEvent.org_id == org.id))
    scraper_runs = await session.execute(delete(ScraperRun).where(ScraperRun.org_id == org.id))
    audit_logs = await session.execute(delete(AuditLog).where(AuditLog.org_id == org.id))
    settings = await session.execute(delete(AppSetting).where(AppSetting.org_id == org.id))
    checklists = await session.execute(delete(ChecklistItem).where(ChecklistItem.org_id == org.id))
    await session.commit()

    seeded = await reset_checklist(session, org.id)

    return OrgResetResponse(
        audits=audits.rowcount or 0,
        alerts=alerts.rowcount or 0,
        scores=scores.rowcount or 0,
        usage_events=usage_events.rowcount or 0,
        scraper_runs=scraper_runs.rowcount or 0,
        audit_logs=audit_logs.rowcount or 0,
        settings=settings.rowcount or 0,
        checklists_cleared=checklists.rowcount or 0,
        checklist_seeded=len(seeded),
    )
