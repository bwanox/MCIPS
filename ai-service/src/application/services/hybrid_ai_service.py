from __future__ import annotations

import json
from json import JSONDecodeError
from typing import Any

import httpx

from src.application.services.threat_classifier_service import ThreatClassifierService
from src.domain.entities.inference_result import InferenceResult
from src.domain.entities.threat_signal import ThreatSignal
from src.domain.enums.risk_level import RiskLevel
from src.domain.enums.threat_label import ThreatLabel
from src.domain.interfaces.llm_gateway import LLMGateway
from src.infrastructure.config.settings import Settings


class HybridAIService:
    def __init__(
        self,
        classifier: ThreatClassifierService,
        settings: Settings,
        llm_gateway: LLMGateway | None = None,
    ) -> None:
        self._classifier = classifier
        self._settings = settings
        self._llm_gateway = llm_gateway

    async def analyze(self, signal: ThreatSignal) -> InferenceResult:
        local_result = self._classifier.classify(signal)
        if not self._should_use_llm():
            return local_result

        try:
            llm_response = await self._llm_gateway.analyze(signal)  # type: ignore[union-attr]
            llm_result = self._parse_llm_result(llm_response)
        except (httpx.HTTPError, TimeoutError, JSONDecodeError, KeyError, TypeError, ValueError):
            return local_result

        merged_features = list(dict.fromkeys(local_result.features + llm_result.features))

        if local_result.risk is RiskLevel.HIGH and llm_result.label is ThreatLabel.SAFE:
            local_result.features = merged_features
            return local_result

        return InferenceResult(
            label=llm_result.label,
            confidence=llm_result.confidence,
            risk=llm_result.risk,
            explanation=llm_result.explanation,
            features=merged_features,
            model_used=self._settings.openrouter_model,
            model_version=llm_result.model_version,
            fallback_used=False,
            top_indicators=llm_result.top_indicators,
            url_analysis=llm_result.url_analysis,
        )

    def _should_use_llm(self) -> bool:
        return (
            self._settings.enable_llm
            and bool(self._settings.openrouter_api_key)
            and self._llm_gateway is not None
        )

    def _parse_llm_result(self, payload: str) -> InferenceResult:
        data: dict[str, Any] = json.loads(payload)
        label = ThreatLabel(data["label"])
        risk = RiskLevel(data["risk"])
        confidence = float(data["confidence"])
        if not 0.0 <= confidence <= 1.0:
            raise ValueError("confidence out of range")
        explanation = str(data["explanation"]).strip()
        if not explanation:
            raise ValueError("explanation required")
        raw_features = data.get("features", [])
        if not isinstance(raw_features, list) or not all(isinstance(item, str) for item in raw_features):
            raise ValueError("features must be a list of strings")
        features = [item.strip() for item in raw_features if item.strip()]
        return InferenceResult(
            label=label,
            confidence=round(confidence, 2),
            risk=risk,
            explanation=explanation,
            features=features,
            model_used=self._settings.openrouter_model,
            model_version="2.0.0",
            fallback_used=False,
            top_indicators=features[:3],
        )
