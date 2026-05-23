from __future__ import annotations

from typing import Any

import httpx

from src.domain.interfaces.reasoning_gateway import ReasoningGateway
from src.infrastructure.config.settings import Settings


class LocalModelClient(ReasoningGateway):
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def complete_json(self, system_prompt: str, user_prompt: str) -> str:
        prompt = f"{system_prompt.strip()}\n\n{user_prompt.strip()}"
        payload: dict[str, Any] = {
            "model": self._settings.local_llm_model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1,
            },
        }
        timeout = httpx.Timeout(self._settings.local_llm_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{self._settings.local_llm_base_url.rstrip('/')}{self._settings.local_llm_generate_path}",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            data = response.json()
        return str(data["response"])

    async def health_check(self) -> bool:
        timeout = httpx.Timeout(min(self._settings.local_llm_timeout_seconds, 5))
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                f"{self._settings.local_llm_base_url.rstrip('/')}{self._settings.local_llm_health_path}"
            )
            response.raise_for_status()
        return True
