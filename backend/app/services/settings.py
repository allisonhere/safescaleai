from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.compliance import AppSetting


async def get_setting(session: AsyncSession, org_id: int, key: str) -> str | None:
    result = await session.execute(
        select(AppSetting).where(AppSetting.key == key, AppSetting.org_id == org_id)
    )
    record = result.scalar_one_or_none()
    return record.value if record else None


async def set_setting(session: AsyncSession, org_id: int, key: str, value: str) -> AppSetting:
    result = await session.execute(
        select(AppSetting).where(AppSetting.key == key, AppSetting.org_id == org_id)
    )
    record = result.scalar_one_or_none()
    if record:
        record.value = value
    else:
        record = AppSetting(key=key, value=value, org_id=org_id)
        session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


async def get_embedding_threshold(session: AsyncSession, org_id: int) -> float:
    value = await get_setting(session, org_id, "embedding_similarity_threshold")
    if value is None:
        return settings.embedding_similarity_threshold
    try:
        return float(value)
    except ValueError:
        return settings.embedding_similarity_threshold
