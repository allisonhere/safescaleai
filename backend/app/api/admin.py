from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_org
from app.db import get_session
from app.models.compliance import Organization
from app.services.settings import get_embedding_threshold, set_setting

router = APIRouter(prefix="/admin", tags=["admin"])


class EmbeddingThreshold(BaseModel):
    value: float = Field(ge=0.0, le=1.0)


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
