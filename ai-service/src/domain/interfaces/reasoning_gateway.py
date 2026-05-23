from __future__ import annotations

from abc import ABC, abstractmethod


class ReasoningGateway(ABC):
    @abstractmethod
    async def complete_json(self, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError

    @abstractmethod
    async def health_check(self) -> bool:
        raise NotImplementedError
