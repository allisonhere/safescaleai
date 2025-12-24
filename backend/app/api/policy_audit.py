from io import BytesIO

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.core.config import settings
from app.db import get_session
from app.schemas.audit import AuditLogCreate
from app.auth import get_current_org
from app.models.compliance import Organization, PolicyAudit
from app.schemas.policy_audit import PolicyAuditRecord, PolicyAuditRunResponse, PolicyGap
from app.services.audit import log_audit_event
from app.services.policy_audit import run_policy_audit

router = APIRouter(prefix="/policy", tags=["policy-audit"])

def _to_record(record: PolicyAudit) -> PolicyAuditRecord:
    gaps = [PolicyGap(**gap) for gap in record.gaps]
    return PolicyAuditRecord(
        id=record.id,
        filename=record.filename,
        score=record.score,
        rating=record.rating,
        matched_items=record.matched_items,
        gaps=gaps,
        guardrail_note=record.guardrail_note,
        doc_type=record.doc_type,
        jurisdiction=record.jurisdiction,
        classifier_notes=record.classifier_notes,
        created_at=record.created_at,
    )


@router.post("/audit", response_model=PolicyAuditRunResponse)
async def audit_policy(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> PolicyAuditRunResponse:
    pdf_bytes = await file.read()
    try:
        result = await run_policy_audit(
            session, pdf_bytes, settings.scan_unit_cost, file.filename or "", org.id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await log_audit_event(
        session,
        AuditLogCreate(
            action="policy_audit",
            actor="user",
            summary=f"Policy audit score {result.score}",
            metadata={"filename": file.filename, "score": result.score},
        ),
        org.id,
    )
    return result


@router.get("/audits/latest", response_model=PolicyAuditRecord | None)
async def latest_audit(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> PolicyAuditRecord | None:
    result = await session.execute(
        select(PolicyAudit)
        .where(PolicyAudit.org_id == org.id)
        .order_by(PolicyAudit.created_at.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if not record:
        return None
    return _to_record(record)


@router.get("/audits", response_model=list[PolicyAuditRecord])
async def list_audits(
    limit: int = 25,
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> list[PolicyAuditRecord]:
    result = await session.execute(
        select(PolicyAudit)
        .where(PolicyAudit.org_id == org.id)
        .order_by(PolicyAudit.created_at.desc())
        .limit(limit)
    )
    return [_to_record(item) for item in result.scalars().all()]


@router.get("/audits/{audit_id}/report")
async def download_audit_report(
    audit_id: int,
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
):
    result = await session.execute(
        select(PolicyAudit).where(PolicyAudit.id == audit_id, PolicyAudit.org_id == org.id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Audit not found")

    payload = {
        "id": record.id,
        "filename": record.filename,
        "score": record.score,
        "rating": record.rating,
        "matched_items": record.matched_items,
        "gaps": record.gaps,
        "guardrail_note": record.guardrail_note,
        "doc_type": record.doc_type,
        "jurisdiction": record.jurisdiction,
        "classifier_notes": record.classifier_notes,
        "created_at": record.created_at.isoformat(),
    }
    headers = {
        "Content-Disposition": f'attachment; filename="policy-audit-{record.id}.json"'
    }
    return JSONResponse(content=payload, headers=headers)


@router.get("/audits/{audit_id}/report.pdf")
async def download_audit_report_pdf(
    audit_id: int,
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
):
    result = await session.execute(
        select(PolicyAudit).where(PolicyAudit.id == audit_id, PolicyAudit.org_id == org.id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Audit not found")

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 50
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, "Policy Audit Report")
    y -= 22
    pdf.setFont("Helvetica", 10)

    def draw_line(text: str) -> None:
        nonlocal y
        if y < 60:
            pdf.showPage()
            y = height - 50
            pdf.setFont("Helvetica", 10)
        pdf.drawString(40, y, text[:120])
        y -= 14

    draw_line(f"Audit ID: {record.id}")
    draw_line(f"Filename: {record.filename}")
    draw_line(f"Created: {record.created_at.isoformat()}")
    draw_line(f"Score: {record.score} ({record.rating})")
    draw_line(
        "Classification: "
        f"{record.doc_type or 'general'} / {record.jurisdiction or 'general'}"
    )
    draw_line(f"Matched items: {len(record.matched_items or [])}")
    draw_line(f"Gaps: {len(record.gaps or [])}")
    draw_line("")

    gaps = record.gaps or []
    if gaps:
        draw_line("Top gaps:")
        for gap in gaps[:10]:
            severity = (gap.get("severity") or "medium").upper()
            item = gap.get("checklist_item", "Unknown requirement")
            draw_line(f"- {severity}: {item}")
        draw_line("")

    matched_items = record.matched_items or []
    if matched_items:
        draw_line("Top matched items:")
        for item in matched_items[:10]:
            draw_line(f"- {item}")

    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="policy-audit-{record.id}.pdf"'},
    )
