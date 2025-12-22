from pydantic import BaseModel


class UsageSummary(BaseModel):
    total_cost: float
    total_scans: int
