from dataclasses import dataclass, field

from src.domain.enums.risk_level import RiskLevel
from src.domain.enums.threat_label import ThreatLabel


@dataclass(slots=True)
class InferenceResult:
    label: ThreatLabel
    confidence: float
    risk: RiskLevel
    explanation: str
    features: list[str] = field(default_factory=list)
    model_used: str = "local_rules_v1"
    model_version: str = "1.0.0"
    fallback_used: bool = True
    top_indicators: list[str] = field(default_factory=list)
    url_analysis: dict = field(default_factory=dict)
