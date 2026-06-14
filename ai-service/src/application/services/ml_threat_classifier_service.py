from __future__ import annotations

from pathlib import Path

from src.infrastructure.ml.models.threat_classifier import PhishingThreat, ThreatClassifierModel


class MlThreatClassifierService:
    def __init__(self, model_path: str) -> None:
        self._model = ThreatClassifierModel()
        self._available = False
        path = Path(model_path)
        vectorizer_path = Path(str(path).replace(".pkl", "_vectorizer.pkl"))
        if path.is_file() and path.stat().st_size > 0 and vectorizer_path.is_file() and vectorizer_path.stat().st_size > 0:
            self._model.load(str(path))
            self._available = True

    @property
    def available(self) -> bool:
        return self._available

    def phishing_probability(self, content: str) -> float | None:
        if not self._available:
            return None
        result = self._model.predict(
            PhishingThreat({"text": content, "language": "english", "label": "safe"})
        )
        probabilities = result.get("probability", [0.0, 0.0])
        return float(probabilities[1])
