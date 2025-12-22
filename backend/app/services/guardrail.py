from app.schemas.policy_audit import PolicyAuditBase


GUARDRAIL_MESSAGE = (
    "Guardrail: This assessment is generated from the stored checklist items only. "
    "Verify with counsel before acting on legal conclusions."
)


def apply_guardrail(response: PolicyAuditBase) -> PolicyAuditBase:
    sanitized = PolicyAuditBase(
        score=response.score,
        rating=response.rating,
        matched_items=list(dict.fromkeys(response.matched_items)),
        gaps=response.gaps,
        guardrail_note=GUARDRAIL_MESSAGE,
    )
    return sanitized
