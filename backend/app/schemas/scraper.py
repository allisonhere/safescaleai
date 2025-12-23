from pydantic import BaseModel, Field


class ScraperRunRequest(BaseModel):
    urls: list[str] | None = Field(default=None, description="Optional override for URLs")


class ScraperRunResponse(BaseModel):
    scanned: int
    alerts_created: int
    notes: list[str]


class ScraperStatus(BaseModel):
    enabled: bool
    last_run_at: str | None
    next_run_at: str | None
    status: str | None
    scanned: int
    alerts_created: int
    notes: list[str]


class ScraperFeeds(BaseModel):
    feeds: list[str] = Field(default_factory=list)
