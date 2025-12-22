from pydantic import BaseModel, Field


class ComplianceScore(BaseModel):
    score: int = Field(ge=0, le=100)
    rating: str


class RegulatoryAlert(BaseModel):
    id: str
    title: str
    summary: str
    severity: str
    source_url: str
    published_at: str


class ComplianceDashboard(BaseModel):
    score: ComplianceScore
    active_alerts: list[RegulatoryAlert]
