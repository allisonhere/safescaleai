from typing import Iterable

from io import BytesIO

from langchain_core.documents import Document
from pypdf import PdfReader, errors as pdf_errors
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pathlib import Path

from app.core.config import settings
from app.models.compliance import ChecklistItem, ComplianceScore, PolicyAudit, UsageEvent
from app.schemas.policy_audit import PolicyAuditBase, PolicyAuditRecord, PolicyGap
from app.services.classifier import classify_document
from app.services.checklist import ensure_checklist
from app.services.embeddings import EmbeddingProvider
from app.services.guardrail import apply_guardrail
from app.services.settings import get_embedding_threshold
from app.services.storage import save_policy_file


def _extract_text_from_pdf(data: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(data))
    except pdf_errors.DependencyError as exc:
        raise ValueError("Encrypted PDF requires cryptography") from exc
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _chunk_text(text: str, max_chars: int = 1500) -> list[str]:
    chunks: list[str] = []
    buffer: list[str] = []
    size = 0
    for paragraph in text.split("\n"):
        if not paragraph.strip():
            continue
        if size + len(paragraph) > max_chars and buffer:
            chunks.append(" ".join(buffer))
            buffer = []
            size = 0
        buffer.append(paragraph.strip())
        size += len(paragraph)
    if buffer:
        chunks.append(" ".join(buffer))
    return chunks


def _score_rating(score: int) -> str:
    if score >= 85:
        return "On track"
    if score >= 70:
        return "Needs attention"
    return "High risk"


async def _find_matches(
    session: AsyncSession,
    checklist: Iterable[ChecklistItem],
    doc_chunks: list[str],
    threshold: float,
) -> tuple[list[str], list[PolicyGap]]:
    matched: dict[int, float] = {}
    embeddings = EmbeddingProvider()
    documents = [Document(page_content=chunk) for chunk in doc_chunks]
    chunk_embeddings = embeddings.embed_documents([doc.page_content for doc in documents])

    checklist_ids = [item.id for item in checklist]
    for embedding in chunk_embeddings:
        distance = ChecklistItem.embedding.cosine_distance(embedding)
        stmt = (
            select(ChecklistItem.id, ChecklistItem.text, distance.label("distance"))
            .where(ChecklistItem.id.in_(checklist_ids))
            .order_by(distance)
            .limit(3)
        )
        result = await session.execute(stmt)
        for item_id, text, dist in result.all():
            if dist is None:
                continue
            best = matched.get(item_id)
            if best is None or dist < best:
                matched[item_id] = dist

    matched_items = []
    gaps: list[PolicyGap] = []
    for item in checklist:
        distance = matched.get(item.id)
        if distance is not None and distance <= threshold:
            matched_items.append(item.text)
        else:
            gaps.append(PolicyGap(checklist_item=item.text, reason="No close match in submitted PDF"))

    return matched_items, gaps


async def run_policy_audit(
    session: AsyncSession,
    pdf_bytes: bytes,
    scan_unit_cost: float,
    filename: str,
    org_id: int,
) -> PolicyAuditRecord:
    text = _extract_text_from_pdf(pdf_bytes)
    chunks = _chunk_text(text)
    classification = classify_document(text)
    checklist_result = await session.execute(
        select(ChecklistItem).where(
            ChecklistItem.org_id == org_id,
            ChecklistItem.doc_type.in_([classification.doc_type, "general"]),
            ChecklistItem.jurisdiction.in_([classification.jurisdiction, "general"]),
        )
    )
    checklist = list(checklist_result.scalars().all())
    if not checklist:
        checklist = await ensure_checklist(session, org_id)

    threshold = await get_embedding_threshold(session, org_id)
    matched, gaps = await _find_matches(session, checklist, chunks, threshold)
    score = int(round((len(matched) / max(1, len(checklist))) * 100))
    rating = _score_rating(score)

    session.add(ComplianceScore(score=score, rating=rating, org_id=org_id))
    session.add(
        UsageEvent(
            event_type="policy_audit",
            units=1,
            unit_cost=scan_unit_cost,
            total_cost=scan_unit_cost,
            meta={"matched": len(matched), "gaps": len(gaps)},
            org_id=org_id,
        )
    )
    await session.commit()

    base_response = PolicyAuditBase(
        score=score,
        rating=rating,
        matched_items=matched,
        gaps=gaps,
        guardrail_note="",
    )
    guarded = apply_guardrail(base_response)

    file_path = save_policy_file(Path(settings.policy_audit_storage_path), filename, pdf_bytes)
    record = PolicyAudit(
        filename=filename or "policy.pdf",
        file_path=str(file_path),
        score=guarded.score,
        rating=guarded.rating,
        matched_items=guarded.matched_items,
        gaps=[gap.model_dump() for gap in guarded.gaps],
        guardrail_note=guarded.guardrail_note,
        org_id=org_id,
        doc_type=classification.doc_type,
        jurisdiction=classification.jurisdiction,
        classifier_notes={
            "reasoning": classification.reasoning,
            "provider": settings.classifier_provider,
        },
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)

    return PolicyAuditRecord(
        id=record.id,
        filename=record.filename,
        score=record.score,
        rating=record.rating,
        matched_items=record.matched_items,
        gaps=[PolicyGap(**gap) for gap in record.gaps],
        guardrail_note=record.guardrail_note,
        doc_type=record.doc_type,
        jurisdiction=record.jurisdiction,
        classifier_notes=record.classifier_notes,
        created_at=record.created_at,
    )
