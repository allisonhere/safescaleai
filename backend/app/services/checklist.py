from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.compliance import ChecklistItem
from app.services.embeddings import EmbeddingProvider

DEFAULT_CHECKLIST = [
    ("general", "general", "Data retention policy defines retention periods for employee and customer data."),
    ("incident_response", "general", "Incident response plan includes breach notification timelines."),
    ("privacy_policy", "general", "Privacy notice discloses data sharing with third parties."),
    ("general", "general", "Access controls are documented for sensitive systems."),
    ("employee_handbook", "general", "Employee handbook covers acceptable use and confidentiality."),
    ("privacy_policy", "general", "Privacy notice explains how to exercise data subject rights."),
    ("privacy_policy", "general", "Cookie and tracking disclosures are documented."),
    ("privacy_policy", "us-ca", "CCPA/CPRA disclosures cover categories of personal information collected."),
    ("privacy_policy", "us-ca", "Opt-out mechanisms for sale/sharing of personal information are described."),
    ("privacy_policy", "eu", "GDPR lawful bases for processing are documented."),
    ("privacy_policy", "eu", "EU data transfer mechanisms are identified."),
    ("incident_response", "general", "Incident response plan defines roles and escalation paths."),
    ("incident_response", "general", "Breach notification templates are prepared."),
    ("incident_response", "us-hipaa", "HIPAA breach notification timelines and patient notice steps are documented."),
    ("employee_handbook", "general", "Employee handbook includes data privacy and security expectations."),
    ("employee_handbook", "general", "Remote work and device security practices are documented."),
    ("employee_handbook", "general", "Confidentiality agreements and reporting procedures are stated."),
    ("general", "general", "Vendor risk management procedures are documented."),
    ("general", "general", "Data classification and handling guidelines are documented."),
    ("general", "general", "Access reviews and user provisioning workflows are documented."),
    ("formulary", "general", "Formulary explains medication tier structure and cost sharing."),
    ("formulary", "general", "Formulary lists covered medications with tier placement."),
    ("formulary", "general", "Formulary describes prior authorization or step therapy rules."),
    ("formulary", "general", "Formulary outlines exceptions or coverage request process."),
    ("formulary", "general", "Formulary includes guidance for non-formulary or excluded drugs."),
    ("formulary", "general", "Formulary defines generic vs brand naming conventions."),
    ("formulary", "general", "Formulary explains specialty pharmacy or mail order requirements."),
    ("formulary", "general", "Formulary includes quantity limits or utilization management notes."),
    ("formulary", "general", "Formulary provides effective date and update cadence."),
    ("formulary", "general", "Formulary specifies how to find in-network pharmacies."),
    ("formulary", "general", "Formulary lists key therapeutic classes and categories."),
]


async def ensure_checklist(session: AsyncSession, org_id: int) -> list[ChecklistItem]:
    result = await session.execute(select(ChecklistItem).where(ChecklistItem.org_id == org_id))
    items = list(result.scalars().all())
    if items:
        return items

    return await seed_checklist(session, org_id)


async def seed_checklist(session: AsyncSession, org_id: int) -> list[ChecklistItem]:
    embeddings = EmbeddingProvider()
    texts = [item[2] for item in DEFAULT_CHECKLIST]
    vectors = embeddings.embed_documents(texts)
    items = [
        ChecklistItem(
            text=text,
            embedding=vector,
            org_id=org_id,
            doc_type=doc_type,
            jurisdiction=jurisdiction,
        )
        for (doc_type, jurisdiction, text), vector in zip(DEFAULT_CHECKLIST, vectors)
    ]
    session.add_all(items)
    await session.commit()
    return items


async def reset_checklist(session: AsyncSession, org_id: int) -> list[ChecklistItem]:
    result = await session.execute(select(ChecklistItem).where(ChecklistItem.org_id == org_id))
    items = list(result.scalars().all())
    for item in items:
        session.delete(item)
    await session.commit()
    return await seed_checklist(session, org_id)
