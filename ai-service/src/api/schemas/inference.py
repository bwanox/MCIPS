from enum import Enum

from pydantic import BaseModel, Field, field_validator

from src.domain.enums.risk_level import RiskLevel
from src.domain.enums.threat_label import ThreatLabel


class EventType(str, Enum):
    SMS = "SMS"
    EMAIL = "EMAIL"
    TEXT = "TEXT"
    LOGIN_ATTEMPT = "LOGIN_ATTEMPT"


class AnalyzeRequest(BaseModel):
    type: EventType
    content: str = Field(..., min_length=1, max_length=10_000)
    source: str | None = Field(default=None, max_length=128)
    ip_address: str | None = Field(default=None, max_length=128)
    country: str | None = Field(default=None, max_length=128)
    device: str | None = Field(default=None, max_length=128)
    user_agent: str | None = Field(default=None, max_length=128)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("content must not be empty")
        return value


class AnalyzeResponse(BaseModel):
    label: ThreatLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    risk: RiskLevel
    explanation: str
    features: list[str]
    model_used: str
    model_version: str
    decision_source: str
    component_scores: dict[str, float]
    evaluation_status: str
    fallback_used: bool
