from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.compliance import Organization

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_current_org(
    session: AsyncSession = Depends(get_session),
    api_key: str | None = Security(api_key_header),
) -> Organization:
    if not api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API key")

    result = await session.execute(select(Organization).where(Organization.api_key == api_key))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
    return org
