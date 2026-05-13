from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from src.domain.entities.inference_result import InferenceResult
from src.domain.entities.threat_signal import ThreatSignal
from src.infrastructure.config.settings import Settings


class InferenceLogRepository:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._entries: list[dict[str, Any]] = []

    async def log(self, signal: ThreatSignal, result: InferenceResult) -> None:
        if not self._settings.inference_logging_enabled:
            return
        self._entries.append(
            {
                "event_type": signal.event_type,
                "label": result.label.value,
                "risk": result.risk.value,
                "confidence": result.confidence,
                "features": result.features,
                "content_length": len(signal.content or ""),
                "source": signal.source,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    def entries(self) -> list[dict[str, Any]]:
        return list(self._entries)
