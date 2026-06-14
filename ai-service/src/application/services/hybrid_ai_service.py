from __future__ import annotations

from src.application.services.ml_threat_classifier_service import MlThreatClassifierService
from src.application.services.threat_classifier_service import ThreatClassifierService
from src.domain.entities.inference_result import InferenceResult
from src.domain.entities.threat_signal import ThreatSignal
from src.domain.enums.threat_label import ThreatLabel
from src.application.use_cases.score_threat import ScoreThreatUseCase
from src.infrastructure.config.settings import Settings


class HybridAIService:
    def __init__(
        self,
        classifier: ThreatClassifierService,
        settings: Settings,
        ml_classifier: MlThreatClassifierService,
    ) -> None:
        self._classifier = classifier
        self._ml_classifier = ml_classifier

    async def analyze(self, signal: ThreatSignal) -> InferenceResult:
        local_result = self._classifier.classify(signal)
        ml_probability = self._ml_classifier.phishing_probability(signal.content or "")
        if ml_probability is None:
            return local_result

        rules_probability = local_result.component_scores.get("rules_score", 0.0)
        combined_probability = min(1.0, (0.6 * rules_probability) + (0.4 * ml_probability))
        label = self._hybrid_label(local_result.label, combined_probability, ml_probability)
        score = round(combined_probability * 100)
        risk = ScoreThreatUseCase.risk_from_score(score)
        confidence = round(
            max(combined_probability, 1.0 - combined_probability),
            4,
        )
        return InferenceResult(
            label=label,
            confidence=confidence,
            risk=risk,
            explanation=(
                f"{local_result.explanation} Pilot TF-IDF phishing probability "
                f"{ml_probability:.2f}; hybrid score {combined_probability:.2f}."
            ),
            features=list(dict.fromkeys(local_result.features + ["tfidf_phishing_probability"])),
            model_used="rules_tfidf_hybrid_v1",
            model_version="1.0.0-pilot",
            decision_source="hybrid",
            component_scores={
                "rules_score": round(rules_probability, 4),
                "ml_probability": round(ml_probability, 4),
                "hybrid_score": round(combined_probability, 4),
            },
            evaluation_status="pilot",
            fallback_used=False,
        )

    @staticmethod
    def _hybrid_label(
        rules_label: ThreatLabel,
        combined_probability: float,
        ml_probability: float,
    ) -> ThreatLabel:
        if rules_label in {ThreatLabel.TOXIC, ThreatLabel.SCAM}:
            return rules_label
        if rules_label is ThreatLabel.PHISHING:
            return ThreatLabel.PHISHING
        if ml_probability >= 0.70 or combined_probability >= 0.62:
            return ThreatLabel.PHISHING
        if combined_probability >= 0.38:
            return ThreatLabel.SUSPICIOUS
        return ThreatLabel.SAFE
