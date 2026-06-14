from __future__ import annotations

from ipaddress import ip_address

from src.application.use_cases.score_threat import ScoreThreatUseCase
from src.domain.entities.inference_result import InferenceResult
from src.domain.entities.threat_signal import ThreatSignal
from src.domain.enums.threat_label import ThreatLabel


class AnomalyDetectionService:
    FEATURE_WEIGHTS: dict[str, int] = {
        "unknown_country": 35,
        "suspicious_ip_prefix": 30,
        "unknown_device": 20,
        "suspicious_user_agent": 15,
    }

    HIGH_RISK_COUNTRIES = {
        "russia",
        "north korea",
        "iran",
        "belarus",
        "unknown",
    }
    SUSPICIOUS_IP_PREFIXES = ("45.", "46.", "91.", "103.", "176.", "185.", "188.", "193.")
    UNKNOWN_DEVICE_MARKERS = {"unknown", "new device", "unrecognized", "generic", "other"}
    BOT_USER_AGENT_MARKERS = {"curl", "python-requests", "bot", "scrapy", "wget", "headless", "postman"}

    def analyze(self, signal: ThreatSignal) -> InferenceResult:
        features = self._extract_features(signal)
        score = sum(self.FEATURE_WEIGHTS[feature] for feature in features)
        label = self._determine_label(score)
        risk = ScoreThreatUseCase.risk_from_score(score)
        confidence = ScoreThreatUseCase.confidence_from_score(score)
        explanation = self._build_explanation(label, features)
        
        # Top indicators sorted by weight
        top_indicators = sorted(features, key=lambda f: self.FEATURE_WEIGHTS.get(f, 0), reverse=True)
        
        return InferenceResult(
            label=label,
            confidence=confidence,
            risk=risk,
            explanation=explanation,
            features=features,
            model_used="local_login_rules_v1",
            model_version="1.0.0",
            fallback_used=True,
            top_indicators=top_indicators,
        )

    def feature_catalog(self) -> list[str]:
        return list(self.FEATURE_WEIGHTS.keys())

    def _extract_features(self, signal: ThreatSignal) -> list[str]:
        features: list[str] = []
        country = (signal.country or "").strip().lower()
        device = (signal.device or "").strip().lower()
        user_agent = (signal.user_agent or "").strip().lower()
        ip_value = (signal.ip_address or "").strip()

        if country and country in self.HIGH_RISK_COUNTRIES:
            features.append("unknown_country")
        if ip_value and self._is_suspicious_ip(ip_value):
            features.append("suspicious_ip_prefix")
        if device and any(marker in device for marker in self.UNKNOWN_DEVICE_MARKERS):
            features.append("unknown_device")
        if user_agent and any(marker in user_agent for marker in self.BOT_USER_AGENT_MARKERS):
            features.append("suspicious_user_agent")
        return features

    def _determine_label(self, score: int) -> ThreatLabel:
        if score >= 60:
            return ThreatLabel.SUSPICIOUS_LOGIN
        if score >= 35:
            return ThreatLabel.SUSPICIOUS
        return ThreatLabel.SAFE

    def _build_explanation(self, label: ThreatLabel, features: list[str]) -> str:
        if not features:
            return f"Classified as {label.value} because the login context did not show anomaly signals."
        return f"Classified as {label.value} because login context contains " + ", ".join(features) + "."

    def _is_suspicious_ip(self, value: str) -> bool:
        try:
            ip_address(value)
        except ValueError:
            return True
        return value.startswith(self.SUSPICIOUS_IP_PREFIXES)
