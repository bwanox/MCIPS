from pydantic import BaseModel


class ThreatListResponse(BaseModel):
    items: list[str]
