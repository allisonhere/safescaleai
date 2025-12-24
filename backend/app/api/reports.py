import csv
from io import BytesIO, StringIO

from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_org
from app.db import get_session
from app.models.compliance import Organization, PolicyAudit, RegulatoryAlert

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/audits.csv")
async def export_audits_csv(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> Response:
    result = await session.execute(
        select(PolicyAudit)
        .where(PolicyAudit.org_id == org.id)
        .order_by(PolicyAudit.created_at.desc())
    )
    audits = result.scalars().all()
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "id",
            "filename",
            "score",
            "rating",
            "doc_type",
            "jurisdiction",
            "matched_count",
            "gap_count",
            "created_at",
        ]
    )
    for audit in audits:
        writer.writerow(
            [
                audit.id,
                audit.filename,
                audit.score,
                audit.rating,
                audit.doc_type,
                audit.jurisdiction,
                len(audit.matched_items),
                len(audit.gaps),
                audit.created_at.isoformat(),
            ]
        )
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=policy-audits.csv"},
    )


@router.get("/audits.pdf")
async def export_audits_pdf(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> Response:
    result = await session.execute(
        select(PolicyAudit)
        .where(PolicyAudit.org_id == org.id)
        .order_by(PolicyAudit.created_at.desc())
    )
    audits = result.scalars().all()
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 50
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, "Policy Audits Report")
    y -= 24
    pdf.setFont("Helvetica", 10)
    if not audits:
        pdf.drawString(40, y, "No policy audits found.")
        y -= 14
    for audit in audits:
        line = (
            f"{audit.created_at.date().isoformat()} | {audit.filename} | "
            f"Score {audit.score} ({audit.rating}) | "
            f"Gaps {len(audit.gaps)}"
        )
        if y < 60:
            pdf.showPage()
            y = height - 50
            pdf.setFont("Helvetica", 10)
        pdf.drawString(40, y, line[:120])
        y -= 14
    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=policy-audits.pdf"},
    )


@router.get("/alerts.csv")
async def export_alerts_csv(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> Response:
    result = await session.execute(
        select(RegulatoryAlert)
        .where(RegulatoryAlert.org_id == org.id)
        .order_by(RegulatoryAlert.created_at.desc())
    )
    alerts = result.scalars().all()
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "id",
            "title",
            "severity",
            "summary",
            "source_url",
            "published_at",
            "created_at",
        ]
    )
    for alert in alerts:
        writer.writerow(
            [
                alert.id,
                alert.title,
                alert.severity,
                alert.summary,
                alert.source_url,
                alert.published_at,
                alert.created_at.isoformat(),
            ]
        )
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=regulatory-alerts.csv"},
    )


@router.get("/alerts.pdf")
async def export_alerts_pdf(
    session: AsyncSession = Depends(get_session),
    org: Organization = Depends(get_current_org),
) -> Response:
    result = await session.execute(
        select(RegulatoryAlert)
        .where(RegulatoryAlert.org_id == org.id)
        .order_by(RegulatoryAlert.created_at.desc())
    )
    alerts = result.scalars().all()
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 50
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, "Regulatory Alerts Report")
    y -= 24
    pdf.setFont("Helvetica", 10)
    if not alerts:
        pdf.drawString(40, y, "No regulatory alerts found.")
        y -= 14
    for alert in alerts:
        line = (
            f"{alert.published_at} | {alert.severity} | {alert.title}"
        )
        if y < 60:
            pdf.showPage()
            y = height - 50
            pdf.setFont("Helvetica", 10)
        pdf.drawString(40, y, line[:120])
        y -= 14
    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=regulatory-alerts.pdf"},
    )
