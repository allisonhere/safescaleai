import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_org
from app.core.config import settings
from app.db import get_session
from app.models.compliance import Organization
from app.services.checklist import reset_checklist
from app.services.settings import get_embedding_threshold, set_setting

router = APIRouter(prefix="/admin", tags=["admin"])

admin_token_header = APIKeyHeader(name="X-Admin-Token", auto_error=False)


class EmbeddingThreshold(BaseModel):
    value: float = Field(ge=0.0, le=1.0)


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
