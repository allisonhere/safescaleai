import asyncio
from datetime import datetime, timedelta

import feedparser
import httpx
from bs4 import BeautifulSoup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from urllib.parse import urljoin

from app.core.config import settings
from app.models.compliance import RegulatoryAlert, ScraperRun
from app.services.settings import get_scraper_feed_urls

SCRAPER_INTERVAL_SECONDS = 3600

KEYWORDS = ["small business", "privacy"]


def _keyword_match(text: str) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in KEYWORDS)


def _discover_feeds(soup: BeautifulSoup, base_url: str) -> list[str]:
    feeds: list[str] = []
    for link in soup.find_all("link", rel="alternate"):
        link_type = (link.get("type") or "").lower()
        href = link.get("href")
        if not href:
            continue
        if "rss" in link_type or "atom" in link_type or "xml" in link_type:
            feeds.append(urljoin(base_url, href))
    return feeds


async def scrape_urls(
    session: AsyncSession, urls: list[str], org_id: int
) -> tuple[int, int, list[str], list[str]]:
    alerts_created = 0
    notes: list[str] = []

    headers = {
        "User-Agent": "SafeScaleAI/1.0 (+https://safescale.ai)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    discovered_feeds: list[str] = []
    async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
        for url in urls:
            try:
                response = await client.get(url)
                response.raise_for_status()
            except httpx.HTTPError as exc:
                notes.append(f"Failed to fetch {url}: {exc}")
                continue

            soup = BeautifulSoup(response.text, "html.parser")
            discovered_feeds.extend(_discover_feeds(soup, url))
            text = " ".join(soup.get_text(" ").split())
            if not _keyword_match(text):
                notes.append(f"No keyword match for {url}")
                continue

            title = soup.title.string.strip() if soup.title and soup.title.string else "Regulatory update"
            summary = "Keyword match: " + ", ".join([kw for kw in KEYWORDS if kw in text.lower()])
            exists = await session.execute(
                select(RegulatoryAlert).where(
                    RegulatoryAlert.source_url == url,
                    RegulatoryAlert.org_id == org_id,
                )
            )
            if exists.scalar_one_or_none():
                notes.append(f"Alert already exists for {url}")
                continue

            alert = RegulatoryAlert(
                title=title[:200],
                summary=summary,
                severity="Medium",
                source_url=url,
                published_at=datetime.utcnow().strftime("%b %d, %Y"),
                raw_payload={"keywords": KEYWORDS},
                org_id=org_id,
            )
            session.add(alert)
            await session.commit()
            alerts_created += 1
            notes.append(f"Alert created for {url}")

    return len(urls), alerts_created, notes, list(dict.fromkeys(discovered_feeds))


async def scrape_feeds(
    session: AsyncSession, feed_urls: list[str], org_id: int
) -> tuple[int, int, list[str]]:
    alerts_created = 0
    notes: list[str] = []
    if not feed_urls:
        return 0, 0, notes

    headers = {
        "User-Agent": "SafeScaleAI/1.0 (+https://safescale.ai)",
        "Accept": "application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
        for feed_url in feed_urls:
            try:
                response = await client.get(feed_url)
                response.raise_for_status()
            except httpx.HTTPError as exc:
                notes.append(f"Failed to fetch feed {feed_url}: {exc}")
                continue

            parsed = feedparser.parse(response.text)
            if parsed.bozo:
                notes.append(f"Malformed feed {feed_url}")
                continue

            for entry in parsed.entries:
                title = (entry.get("title") or "").strip()
                summary_html = (entry.get("summary") or entry.get("description") or "").strip()
                link = (entry.get("link") or "").strip()
                published = (entry.get("published") or entry.get("updated") or "").strip()
                summary_text = (
                    BeautifulSoup(summary_html, "html.parser").get_text(" ", strip=True)
                    if summary_html
                    else ""
                )
                combined = f"{title} {summary_text}".strip()
                if not combined:
                    continue
                matched = _keyword_match(combined)
                if settings.scraper_feed_require_keyword and not matched:
                    continue

                if not link:
                    notes.append(f"Feed entry missing link in {feed_url}")
                    continue

                exists = await session.execute(
                    select(RegulatoryAlert).where(
                        RegulatoryAlert.source_url == link,
                        RegulatoryAlert.org_id == org_id,
                    )
                )
                if exists.scalar_one_or_none():
                    continue

                keyword_note = (
                    "Keyword match: " + ", ".join([kw for kw in KEYWORDS if kw in combined.lower()])
                    if matched
                    else "Feed item ingested"
                )
                alert = RegulatoryAlert(
                    title=title[:200] if title else "Regulatory update",
                    summary=summary_text[:500] if summary_text else keyword_note,
                    severity="Medium" if matched else "Low",
                    source_url=link,
                    published_at=published or datetime.utcnow().strftime("%b %d, %Y"),
                    raw_payload={"feed": feed_url},
                    org_id=org_id,
                )
                session.add(alert)
                await session.commit()
                alerts_created += 1

            notes.append(f"Parsed feed {feed_url}")

    return len(feed_urls), alerts_created, notes


async def record_scraper_run(
    session: AsyncSession,
    scanned: int,
    created: int,
    notes: list[str],
    started_at: datetime,
    org_id: int,
) -> ScraperRun:
    status = "success"
    if any(note.startswith("Failed to fetch") for note in notes):
        status = "partial"
    if scanned == 0:
        status = "no_urls"

    record = ScraperRun(
        status=status,
        scanned=scanned,
        alerts_created=created,
        notes=notes,
        started_at=started_at,
        finished_at=datetime.utcnow(),
        org_id=org_id,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


def next_run_at(last_finished: datetime | None) -> str | None:
    if not last_finished:
        return None
    return (last_finished + timedelta(seconds=SCRAPER_INTERVAL_SECONDS)).isoformat()


async def scraper_loop(session_factory, urls: list[str], org_id: int) -> None:
    while True:
        started_at = datetime.utcnow()
        async with session_factory() as session:
            feed_urls = await get_scraper_feed_urls(session, org_id)
            url_scanned, url_created, url_notes, discovered_feeds = await scrape_urls(
                session, urls, org_id
            )
            combined_feeds = list(dict.fromkeys(feed_urls + discovered_feeds))
            feed_scanned, feed_created, feed_notes = await scrape_feeds(
                session, combined_feeds, org_id
            )
            scanned = url_scanned + feed_scanned
            created = url_created + feed_created
            notes = url_notes + feed_notes
            await record_scraper_run(session, scanned, created, notes, started_at, org_id)
        await asyncio.sleep(SCRAPER_INTERVAL_SECONDS)
