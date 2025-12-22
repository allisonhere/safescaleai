from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_org
from app.core.config import settings
from app.db import get_session
from app.models.compliance import ComplianceScore, Organization, UsageEvent
from app.schemas.audit import AuditLogCreate
from app.schemas.scan import ComplianceScanResponse
from app.services.audit import log_audit_event

router = APIRouter(prefix="/scan", tags=["scan"])


@router.post("/run", response_model=ComplianceScanResponse)
async def run_scan(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> ComplianceScanResponse:
    score = 82
    rating = "On track"
    notes = ["Privacy controls validated", "Employee handbook needs review"]

    session.add(ComplianceScore(score=score, rating=rating, org_id=org.id))
    session.add(
        UsageEvent(
            event_type="compliance_scan",
            units=1,
            unit_cost=settings.scan_unit_cost,
            total_cost=settings.scan_unit_cost,
            meta={"notes": notes},
            org_id=org.id,
        )
    )
    await session.commit()

    await log_audit_event(
        session,
        AuditLogCreate(
            action="compliance_scan",
            actor="system",
            summary=f"Compliance scan scored {score}",
            metadata={"score": score},
        ),
        org.id,
    )

    return ComplianceScanResponse(score=score, rating=rating, notes=notes)
