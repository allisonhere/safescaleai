from __future__ import annotations

from dataclasses import dataclass

DOC_TYPES = {
    "general",
    "policy",
    "procedure",
    "risk_assessment",
    "control_mapping",
    "audit_report",
    "incident_response",
    "business_continuity",
    "privacy_policy",
    "security_architecture",
    "vendor_program",
    "training_attestation",
    "legal_contract",
    "compliance_report",
    "employee_handbook",
    "formulary",
}

DOC_TYPE_SYNONYMS = {
    "privacy_notice": "privacy_policy",
    "incident_response_plan": "incident_response",
    "disaster_recovery": "business_continuity",
    "bcdr": "business_continuity",
    "dr_plan": "business_continuity",
    "sop": "procedure",
    "standard_operating_procedure": "procedure",
    "third_party": "vendor_program",
    "vendor_management": "vendor_program",
    "assessment_report": "audit_report",
    "soc2_report": "audit_report",
    "attestation_report": "audit_report",
    "dpa": "legal_contract",
    "msa": "legal_contract",
}

from app.core.config import settings


@dataclass
class DocumentClassification:
    doc_type: str
    jurisdiction: str
    reasoning: str


def _normalize_doc_type(value: str) -> str:
    normalized = value.strip().lower().replace(" ", "_")
    normalized = DOC_TYPE_SYNONYMS.get(normalized, normalized)
    return normalized if normalized in DOC_TYPES else "general"


def _has_strong_hipaa_signal(text: str) -> bool:
    lowered = text.lower()
    if "hipaa" not in lowered:
        return False
    return any(
        phrase in lowered
        for phrase in [
            "protected health information",
            "phi",
            "covered entity",
            "business associate",
            "hipaa privacy rule",
            "hipaa security rule",
        ]
    )


def _apply_industry_bias(
    doc_type: str, jurisdiction: str, text: str, industry: str | None
) -> tuple[str, str, str | None]:
    if jurisdiction == "us-hipaa" and industry and industry != "healthcare":
        if not _has_strong_hipaa_signal(text):
            return doc_type, "general", "Adjusted jurisdiction to general for non-healthcare industry"
    return doc_type, jurisdiction, None


def _heuristic_classify(text: str, industry: str | None = None) -> DocumentClassification:
    lowered = text.lower()
    doc_type = "general"
    jurisdiction = "general"
    reasons: list[str] = []

    if "formulary" in lowered or ("tier" in lowered and ("medication" in lowered or "drug" in lowered)):
        doc_type = "formulary"
        reasons.append("Detected formulary/medication tier language")
    elif "employee handbook" in lowered or ("employee" in lowered and "handbook" in lowered):
        doc_type = "employee_handbook"
        reasons.append("Detected employee handbook language")
    elif "privacy policy" in lowered or "privacy notice" in lowered:
        doc_type = "privacy_policy"
        reasons.append("Detected privacy policy/notice language")
    elif "incident response" in lowered:
        doc_type = "incident_response"
        reasons.append("Detected incident response language")
    elif "business continuity" in lowered or "disaster recovery" in lowered:
        doc_type = "business_continuity"
        reasons.append("Detected business continuity/disaster recovery language")
    elif "risk assessment" in lowered or "risk analysis" in lowered:
        doc_type = "risk_assessment"
        reasons.append("Detected risk assessment language")
    elif "audit report" in lowered or "assessment report" in lowered:
        doc_type = "audit_report"
        reasons.append("Detected audit/assessment report language")
    elif "security architecture" in lowered or "architecture diagram" in lowered:
        doc_type = "security_architecture"
        reasons.append("Detected security architecture language")
    elif "vendor" in lowered or "third party" in lowered:
        if "management" in lowered or "program" in lowered or "due diligence" in lowered:
            doc_type = "vendor_program"
            reasons.append("Detected vendor/third-party program language")
    elif "training" in lowered or "security awareness" in lowered or "attestation" in lowered:
        doc_type = "training_attestation"
        reasons.append("Detected training/attestation language")
    elif "contract" in lowered or "agreement" in lowered or "msa" in lowered:
        doc_type = "legal_contract"
        reasons.append("Detected contractual language")
    elif "compliance report" in lowered or "soc 2" in lowered or "iso 27001" in lowered:
        doc_type = "compliance_report"
        reasons.append("Detected compliance report language")
    elif "policy" in lowered:
        doc_type = "policy"
        reasons.append("Detected policy language")
    elif "procedure" in lowered or "sop" in lowered:
        doc_type = "procedure"
        reasons.append("Detected procedure language")

    if industry and industry != "general":
        reasons.append(f"Industry context: {industry}")

    if "gdpr" in lowered or "european union" in lowered:
        jurisdiction = "eu"
        reasons.append("Detected GDPR/EU references")
    elif "ccpa" in lowered or "california" in lowered:
        jurisdiction = "us-ca"
        reasons.append("Detected California/CCPA references")
    elif "hipaa" in lowered:
        jurisdiction = "us-hipaa"
        reasons.append("Detected HIPAA references")

    normalized_doc_type = _normalize_doc_type(doc_type)
    adjusted_doc_type, adjusted_jurisdiction, adjustment_note = _apply_industry_bias(
        normalized_doc_type, jurisdiction, text, industry
    )
    if adjustment_note:
        reasons.append(adjustment_note)

    return DocumentClassification(
        doc_type=adjusted_doc_type,
        jurisdiction=adjusted_jurisdiction,
        reasoning=", ".join(reasons) if reasons else "Heuristic default",
    )


def classify_document(text: str, industry: str | None = None) -> DocumentClassification:
    if settings.classifier_provider != "openai" or not settings.openai_api_key:
        return _heuristic_classify(text, industry=industry)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        prompt = (
            "Classify the document text into a JSON object with keys: "
            "doc_type ("
            "general, policy, procedure, risk_assessment, control_mapping, audit_report, "
            "incident_response, business_continuity, privacy_policy, security_architecture, "
            "vendor_program, training_attestation, legal_contract, compliance_report, "
            "employee_handbook, formulary"
            "), "
            "jurisdiction (us-ca, us-hipaa, eu, general), "
            "reasoning (short string).\n\n"
            f"Industry context: {industry or 'general'}\n\n"
            f"Text:\n{text[:4000]}"
        )
        response = client.responses.create(
            model=settings.classifier_model,
            input=prompt,
        )
        output = response.output_text
        if output:
            import json

            data = json.loads(output)
            normalized_doc_type = _normalize_doc_type(str(data.get("doc_type", "general")))
            jurisdiction = str(data.get("jurisdiction", "general"))
            adjusted_doc_type, adjusted_jurisdiction, adjustment_note = _apply_industry_bias(
                normalized_doc_type, jurisdiction, text, industry
            )
            reasoning = str(data.get("reasoning", "OpenAI classification"))
            if adjustment_note:
                reasoning = f"{reasoning}; {adjustment_note}"
            return DocumentClassification(
                doc_type=adjusted_doc_type,
                jurisdiction=adjusted_jurisdiction,
                reasoning=reasoning,
            )
    except Exception:
        return _heuristic_classify(text, industry=industry)

    return _heuristic_classify(text, industry=industry)
