from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.compliance import ChecklistItem
from app.services.embeddings import EmbeddingProvider

DEFAULT_CHECKLIST = [
    ("policy", "general", "general", "Policy statements define scope, purpose, and ownership."),
    ("procedure", "general", "general", "Procedures specify step-by-step execution and responsible roles."),
    ("risk_assessment", "general", "general", "Risk assessments document threats, likelihood, and impact."),
    ("control_mapping", "general", "general", "Control mappings align requirements to implemented controls."),
    ("audit_report", "general", "general", "Audit reports summarize findings, exceptions, and remediation."),
    ("business_continuity", "general", "general", "BC/DR plans define recovery objectives and critical systems."),
    (
        "security_architecture",
        "general",
        "general",
        "Security architecture documents system boundaries and data flows.",
    ),
    (
        "vendor_program",
        "general",
        "general",
        "Third-party risk program defines due diligence and monitoring cadence.",
    ),
    ("training_attestation", "general", "general", "Training records include completion evidence and attestation."),
    ("legal_contract", "general", "general", "Agreements include data protection and confidentiality obligations."),
    ("compliance_report", "general", "general", "Compliance reports outline scope, period, and assurance results."),
    (
        "policy",
        "general",
        "fintech",
        "Policies address payment data handling and cardholder data controls.",
    ),
    (
        "policy",
        "general",
        "healthcare",
        "Policies reference HIPAA privacy and security safeguards for PHI.",
    ),
    (
        "risk_assessment",
        "general",
        "saas",
        "Risk assessments cover multi-tenant isolation and customer data boundaries.",
    ),
    (
        "vendor_program",
        "general",
        "retail",
        "Vendor oversight includes POS providers and payment processors.",
    ),
    (
        "incident_response",
        "general",
        "healthcare",
        "Incident response includes HIPAA breach notification timelines.",
    ),
    ("general", "general", "general", "Data retention policy defines retention periods for employee and customer data."),
    ("incident_response", "general", "general", "Incident response plan includes breach notification timelines."),
    ("privacy_policy", "general", "general", "Privacy notice discloses data sharing with third parties."),
    ("general", "general", "general", "Access controls are documented for sensitive systems."),
    ("employee_handbook", "general", "general", "Employee handbook covers acceptable use and confidentiality."),
    ("privacy_policy", "general", "general", "Privacy notice explains how to exercise data subject rights."),
    ("privacy_policy", "general", "general", "Cookie and tracking disclosures are documented."),
    ("privacy_policy", "us-ca", "general", "CCPA/CPRA disclosures cover categories of personal information collected."),
    ("privacy_policy", "us-ca", "general", "Opt-out mechanisms for sale/sharing of personal information are described."),
    ("privacy_policy", "eu", "general", "GDPR lawful bases for processing are documented."),
    ("privacy_policy", "eu", "general", "EU data transfer mechanisms are identified."),
    ("incident_response", "general", "general", "Incident response plan defines roles and escalation paths."),
    ("incident_response", "general", "general", "Breach notification templates are prepared."),
    (
        "incident_response",
        "us-hipaa",
        "general",
        "HIPAA breach notification timelines and patient notice steps are documented.",
    ),
    ("employee_handbook", "general", "general", "Employee handbook includes data privacy and security expectations."),
    ("employee_handbook", "general", "general", "Remote work and device security practices are documented."),
    ("employee_handbook", "general", "general", "Confidentiality agreements and reporting procedures are stated."),
    ("general", "general", "general", "Vendor risk management procedures are documented."),
    ("general", "general", "general", "Data classification and handling guidelines are documented."),
    ("general", "general", "general", "Access reviews and user provisioning workflows are documented."),
    ("formulary", "general", "healthcare", "Formulary explains medication tier structure and cost sharing."),
    ("formulary", "general", "healthcare", "Formulary lists covered medications with tier placement."),
    ("formulary", "general", "healthcare", "Formulary describes prior authorization or step therapy rules."),
    ("formulary", "general", "healthcare", "Formulary outlines exceptions or coverage request process."),
    ("formulary", "general", "healthcare", "Formulary includes guidance for non-formulary or excluded drugs."),
    ("formulary", "general", "healthcare", "Formulary defines generic vs brand naming conventions."),
    ("formulary", "general", "healthcare", "Formulary explains specialty pharmacy or mail order requirements."),
    ("formulary", "general", "healthcare", "Formulary includes quantity limits or utilization management notes."),
    ("formulary", "general", "healthcare", "Formulary provides effective date and update cadence."),
    ("formulary", "general", "healthcare", "Formulary specifies how to find in-network pharmacies."),
    ("formulary", "general", "healthcare", "Formulary lists key therapeutic classes and categories."),
]


async def ensure_checklist(session: AsyncSession, org_id: int) -> list[ChecklistItem]:
    result = await session.execute(select(ChecklistItem).where(ChecklistItem.org_id == org_id))
    items = list(result.scalars().all())
    if items:
        return items

    return await seed_checklist(session, org_id)


async def seed_checklist(session: AsyncSession, org_id: int) -> list[ChecklistItem]:
    embeddings = EmbeddingProvider()
    texts = [item[3] for item in DEFAULT_CHECKLIST]
    vectors = embeddings.embed_documents(texts)
    items = [
        ChecklistItem(
            text=text,
            embedding=vector,
            org_id=org_id,
            doc_type=doc_type,
            jurisdiction=jurisdiction,
            industry=industry,
        )
        for (doc_type, jurisdiction, industry, text), vector in zip(DEFAULT_CHECKLIST, vectors)
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
