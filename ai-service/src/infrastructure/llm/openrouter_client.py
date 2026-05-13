from __future__ import annotations

from typing import Any

import httpx

from src.infrastructure.config.settings import Settings


class OpenRouterClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def complete_json(self, system_prompt: str, user_prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {self._settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self._settings.openrouter_model,
            "temperature": 0.1,
            "top_p": 0.9,
            "max_tokens": 300,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        timeout = httpx.Timeout(self._settings.request_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(self._settings.openrouter_api_url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        return data["choices"][0]["message"]["content"]
