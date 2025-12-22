from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AuditLogCreate(BaseModel):
    action: str
    actor: str
    target: str | None = None
    outcome: str = "success"
    summary: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AuditLogRead(AuditLogCreate):
    id: int
    created_at: datetime
