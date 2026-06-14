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
    decision_source: str = "rules"
    component_scores: dict[str, float] = field(default_factory=dict)
    evaluation_status: str = "pilot"
    fallback_used: bool = True
