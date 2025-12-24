import json

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


async def get_scraper_feed_urls(session: AsyncSession, org_id: int) -> list[str]:
    value = await get_setting(session, org_id, "scraper_feed_urls")
    if value is None:
        return settings.scraper_feed_urls
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return settings.scraper_feed_urls
    if not isinstance(parsed, list):
        return settings.scraper_feed_urls
    cleaned = [item.strip() for item in parsed if isinstance(item, str) and item.strip()]
    return cleaned


async def set_scraper_feed_urls(session: AsyncSession, org_id: int, urls: list[str]) -> AppSetting:
    cleaned = []
    seen = set()
    for item in urls:
        normalized = item.strip()
        if not normalized or normalized in seen:
            continue
        cleaned.append(normalized)
        seen.add(normalized)
    return await set_setting(session, org_id, "scraper_feed_urls", json.dumps(cleaned))


async def get_industry_setting(session: AsyncSession, org_id: int) -> str:
    value = await get_setting(session, org_id, "industry")
    return value if value else "general"
