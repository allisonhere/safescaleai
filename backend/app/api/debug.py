from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_org
from app.db import get_session
from app.models.compliance import Organization
from app.services.embeddings import EmbeddingProvider
from app.services.settings import get_embedding_threshold

router = APIRouter(prefix="/debug", tags=["debug"])


class EmbeddingDebug(BaseModel):
    provider: str
    model: str
    threshold: float


@router.get("/embeddings", response_model=EmbeddingDebug)
async def embeddings_debug(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> EmbeddingDebug:
    provider = EmbeddingProvider()
    threshold = await get_embedding_threshold(session, org.id)
    info = provider.info()
    return EmbeddingDebug(provider=info["provider"], model=info["model"], threshold=threshold)
