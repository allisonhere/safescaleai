from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_org
from app.db import get_session
from app.models.audit import AuditLog
from app.models.compliance import Organization
from app.schemas.audit import AuditLogRead

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/recent", response_model=list[AuditLogRead])
async def recent_audit_logs(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> list[AuditLogRead]:
    result = await session.execute(
        select(AuditLog)
        .where(AuditLog.org_id == org.id)
        .order_by(AuditLog.created_at.desc())
        .limit(50)
    )
    return [
        AuditLogRead(
            id=item.id,
            action=item.action,
            actor=item.actor,
            target=item.target,
            outcome=item.outcome,
            summary=item.summary,
            metadata=item.meta,
            created_at=item.created_at,
        )
        for item in result.scalars().all()
    ]
