from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.schemas.audit import AuditLogCreate


async def log_audit_event(session: AsyncSession, payload: AuditLogCreate, org_id: int) -> AuditLog:
    entry = AuditLog(
        action=payload.action,
        actor=payload.actor,
        target=payload.target,
        outcome=payload.outcome,
        summary=payload.summary,
        meta=payload.metadata,
        org_id=org_id,
    )
    session.add(entry)
    await session.commit()
    await session.refresh(entry)
    return entry
