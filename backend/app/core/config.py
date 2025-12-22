from pathlib import Path

from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = "SafeScale AI Backend"
    database_url: str = "postgresql+asyncpg://safescale:safescale_dev@localhost:5432/safescale"
    admin_bootstrap_token: str | None = None
    scraper_urls: list[str] = [
        "https://www.ftc.gov/news-events/news/press-releases",
        "https://oag.ca.gov/privacy",
        "https://www.hhs.gov/hipaa",
    ]
    scraper_feed_urls: list[str] = [
        "https://www.ftc.gov/feeds/press-release.xml",
    ]
    scraper_feed_require_keyword: bool = False
    scraper_enabled: bool = False
    scraper_org_api_key: str | None = None
    scan_unit_cost: float = 4.50
    policy_audit_storage_path: str = "storage/policy_audits"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.86.43:3000",
    ]
    cors_origin_regex: str | None = r"http://192\.168\.\d+\.\d+:3000"
    mcp_base_path: str = str(BASE_DIR / "data")
    mcp_mbox_path: str = str(BASE_DIR / "data" / "inbox.mbox")
    embedding_provider: str = "hash"
    openai_api_key: str | None = None
    openai_embedding_model: str = "text-embedding-3-small"
    embedding_similarity_threshold: float = 0.45
    classifier_provider: str = "heuristic"
    classifier_model: str = "gpt-4o-mini"


settings = Settings()
