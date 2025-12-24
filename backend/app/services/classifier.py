from __future__ import annotations

from dataclasses import dataclass

from app.core.config import settings


@dataclass
class DocumentClassification:
    doc_type: str
    jurisdiction: str
    reasoning: str


def _heuristic_classify(text: str) -> DocumentClassification:
    lowered = text.lower()
    doc_type = "general"
    jurisdiction = "general"
    reasons: list[str] = []

    if "formulary" in lowered or ("tier" in lowered and ("medication" in lowered or "drug" in lowered)):
        doc_type = "formulary"
        reasons.append("Detected formulary/medication tier language")
    elif "employee handbook" in lowered or "employee" in lowered and "handbook" in lowered:
        doc_type = "employee_handbook"
        reasons.append("Detected employee handbook language")
    elif "privacy policy" in lowered or "privacy notice" in lowered:
        doc_type = "privacy_policy"
        reasons.append("Detected privacy policy language")
    elif "incident response" in lowered:
        doc_type = "incident_response"
        reasons.append("Detected incident response language")

    if "gdpr" in lowered or "european union" in lowered:
        jurisdiction = "eu"
        reasons.append("Detected GDPR/EU references")
    elif "ccpa" in lowered or "california" in lowered:
        jurisdiction = "us-ca"
        reasons.append("Detected California/CCPA references")
    elif "hipaa" in lowered:
        jurisdiction = "us-hipaa"
        reasons.append("Detected HIPAA references")

    return DocumentClassification(
        doc_type=doc_type,
        jurisdiction=jurisdiction,
        reasoning=", ".join(reasons) if reasons else "Heuristic default",
    )


def classify_document(text: str) -> DocumentClassification:
    if settings.classifier_provider != "openai" or not settings.openai_api_key:
        return _heuristic_classify(text)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        prompt = (
            "Classify the document text into a JSON object with keys: "
            "doc_type (employee_handbook, privacy_policy, incident_response, formulary, general), "
            "jurisdiction (us-ca, us-hipaa, eu, general), "
            "reasoning (short string).\n\n"
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
            return DocumentClassification(
                doc_type=str(data.get("doc_type", "general")),
                jurisdiction=str(data.get("jurisdiction", "general")),
                reasoning=str(data.get("reasoning", "OpenAI classification")),
            )
    except Exception:
        return _heuristic_classify(text)

    return _heuristic_classify(text)
