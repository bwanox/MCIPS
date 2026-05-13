from __future__ import annotations

from abc import ABC, abstractmethod

from src.domain.entities.threat_signal import ThreatSignal


class LLMGateway(ABC):
    @abstractmethod
    async def analyze(self, signal: ThreatSignal) -> str:
        raise NotImplementedError
