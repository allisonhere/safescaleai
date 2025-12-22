from pydantic import BaseModel


class ComplianceScanResponse(BaseModel):
    score: int
    rating: str
    notes: list[str]
