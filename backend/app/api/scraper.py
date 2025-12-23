from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_org
from app.core.config import settings
from app.db import get_session
from app.models.compliance import Organization, ScraperRun
from app.schemas.audit import AuditLogCreate
from app.schemas.scraper import ScraperFeeds, ScraperRunRequest, ScraperRunResponse, ScraperStatus
from app.services.audit import log_audit_event
from app.services.scraper import next_run_at, record_scraper_run, scrape_feeds, scrape_urls
from app.services.settings import get_scraper_feed_urls, set_scraper_feed_urls

router = APIRouter(prefix="/scraper", tags=["scraper"])


@router.post("/run", response_model=ScraperRunResponse)
async def run_scraper(
    payload: ScraperRunRequest,
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> ScraperRunResponse:
    urls = payload.urls or settings.scraper_urls
    started_at = datetime.utcnow()
    url_scanned, url_created, url_notes, discovered_feeds = await scrape_urls(
        session, urls, org.id
    )
    feed_urls = await get_scraper_feed_urls(session, org.id)
    combined_feeds = list(dict.fromkeys(feed_urls + discovered_feeds))
    feed_scanned, feed_created, feed_notes = await scrape_feeds(
        session, combined_feeds, org.id
    )
    scanned = url_scanned + feed_scanned
    created = url_created + feed_created
    notes = url_notes + feed_notes
    await record_scraper_run(session, scanned, created, notes, started_at, org.id)
    await log_audit_event(
        session,
        AuditLogCreate(
            action="scraper_run",
            actor="system",
            summary=f"Scanned {scanned} URLs, created {created} alerts",
            metadata={"urls": urls},
        ),
        org.id,
    )
    return ScraperRunResponse(scanned=scanned, alerts_created=created, notes=notes)


@router.get("/status", response_model=ScraperStatus)
async def scraper_status(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> ScraperStatus:
    result = await session.execute(
        select(ScraperRun)
        .where(ScraperRun.org_id == org.id)
        .order_by(ScraperRun.started_at.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()
    return ScraperStatus(
        enabled=settings.scraper_enabled,
        last_run_at=record.started_at.isoformat() if record else None,
        next_run_at=next_run_at(record.finished_at) if record else None,
        status=record.status if record else None,
        scanned=record.scanned if record else 0,
        alerts_created=record.alerts_created if record else 0,
        notes=record.notes if record else [],
    )


@router.get("/feeds", response_model=ScraperFeeds)
async def read_scraper_feeds(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> ScraperFeeds:
    feeds = await get_scraper_feed_urls(session, org.id)
    return ScraperFeeds(feeds=feeds)


@router.put("/feeds", response_model=ScraperFeeds)
async def update_scraper_feeds(
    payload: ScraperFeeds,
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> ScraperFeeds:
    await set_scraper_feed_urls(session, org.id, payload.feeds)
    feeds = await get_scraper_feed_urls(session, org.id)
    return ScraperFeeds(feeds=feeds)
