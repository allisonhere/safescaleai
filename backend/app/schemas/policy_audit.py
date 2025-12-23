from datetime import datetime

from pydantic import BaseModel, Field


class PolicyGap(BaseModel):
    checklist_item: str
    reason: str
    severity: str = "medium"


class PolicyAuditBase(BaseModel):
    score: int = Field(ge=0, le=100)
    rating: str
    matched_items: list[str]
    gaps: list[PolicyGap]
    guardrail_note: str
    doc_type: str = "general"
    jurisdiction: str = "general"
    classifier_notes: dict[str, str] | None = None


class PolicyAuditRecord(PolicyAuditBase):
    id: int
    filename: str
    created_at: datetime


class PolicyAuditRunResponse(PolicyAuditRecord):
    pass
