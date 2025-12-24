from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.compliance import PolicyAudit, RegulatoryAlert


def _score_rating(score: int) -> str:
    if score >= 85:
        return "On track"
    if score >= 70:
        return "Needs attention"
    return "High risk"


async def run_compliance_scan(session: AsyncSession, org_id: int) -> tuple[int, str, list[str]]:
    result = await session.execute(
        select(PolicyAudit)
        .where(PolicyAudit.org_id == org_id)
        .order_by(PolicyAudit.created_at.desc())
        .limit(3)
    )
    audits = list(result.scalars().all())
    notes: list[str] = []

    if audits:
        avg_score = int(round(sum(audit.score for audit in audits) / len(audits)))
        latest = audits[0]
        rating = _score_rating(avg_score)
        notes.append(f"Based on {len(audits)} recent policy audits")
        notes.append(f"Latest audit: {latest.filename} scored {latest.score}")
        notes.append(f"{len(latest.gaps)} gaps flagged in latest audit")
    else:
        avg_score = 60
        rating = _score_rating(avg_score)
        notes.append("No policy audits yet; run a policy audit to refine the score")

    alerts_result = await session.execute(
        select(func.count(RegulatoryAlert.id)).where(RegulatoryAlert.org_id == org_id)
    )
    alert_count = alerts_result.scalar_one() or 0
    if alert_count:
        notes.append(f"{alert_count} regulatory alerts pending review")

    return avg_score, rating, notes
