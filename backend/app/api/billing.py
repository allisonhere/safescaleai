from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_org
from app.db import get_session
from app.models.compliance import Organization, UsageEvent
from app.schemas.billing import UsageSummary

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/usage", response_model=UsageSummary)
async def usage_summary(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> UsageSummary:
    result = await session.execute(
        select(func.coalesce(func.sum(UsageEvent.total_cost), 0.0), func.count(UsageEvent.id))
        .where(
            UsageEvent.event_type.in_(["policy_audit", "compliance_scan"]),
            UsageEvent.org_id == org.id,
        )
    )
    total_cost, total_scans = result.one()
    return UsageSummary(total_cost=float(total_cost), total_scans=int(total_scans))
