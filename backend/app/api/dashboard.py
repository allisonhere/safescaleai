from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_org
from app.db import get_session
from app.models.compliance import ComplianceScore, Organization, RegulatoryAlert
from app.schemas.compliance import ComplianceDashboard, ComplianceScore as ScoreSchema, RegulatoryAlert as AlertSchema

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=ComplianceDashboard)
async def get_dashboard(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> ComplianceDashboard:
    score_result = await session.execute(
        select(ComplianceScore)
        .where(ComplianceScore.org_id == org.id)
        .order_by(ComplianceScore.created_at.desc())
        .limit(1)
    )
    score_row = score_result.scalar_one_or_none()
    if score_row:
        score = ScoreSchema(score=score_row.score, rating=score_row.rating)
    else:
        score = ScoreSchema(score=78, rating="Needs attention")

    alerts_result = await session.execute(
        select(RegulatoryAlert)
        .where(RegulatoryAlert.org_id == org.id)
        .order_by(RegulatoryAlert.created_at.desc())
        .limit(10)
    )
    alerts = [
        AlertSchema(
            id=str(alert.id),
            title=alert.title,
            summary=alert.summary,
            severity=alert.severity,
            source_url=alert.source_url,
            published_at=alert.published_at,
        )
        for alert in alerts_result.scalars().all()
    ]

    return ComplianceDashboard(score=score, active_alerts=alerts)
