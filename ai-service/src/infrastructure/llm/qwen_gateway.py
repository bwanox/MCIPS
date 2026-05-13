from __future__ import annotations

from src.domain.entities.threat_signal import ThreatSignal
from src.domain.interfaces.llm_gateway import LLMGateway
from src.infrastructure.llm.openrouter_client import OpenRouterClient

SYSTEM_PROMPT = """You are the AI threat analysis engine of MCIPS, a Moroccan Cyber Intelligence & Protection System.
Classify cyber events affecting Moroccan users.
Classify as one of:
- phishing
- scam
- safe
- toxic
- suspicious
- suspicious_login

Return ONLY valid JSON:
{
  "label": "...",
  "confidence": 0.0,
  "risk": "LOW | MEDIUM | HIGH",
  "explanation": "...",
  "features": ["..."]
}

Focus on suspicious links, urgent language, banking requests, OTP/password requests, fake rewards, account-blocking claims, toxic language, suspicious login context, and Moroccan financial/telecom context.
Do not include markdown.
Do not include chain-of-thought.
Do not invent facts."""


class QwenGateway(LLMGateway):
    def __init__(self, client: OpenRouterClient) -> None:
        self._client = client

    async def analyze(self, signal: ThreatSignal) -> str:
        user_prompt = self._build_user_prompt(signal)
        return await self._client.complete_json(SYSTEM_PROMPT, user_prompt)

    @staticmethod
    def _build_user_prompt(signal: ThreatSignal) -> str:
        return (
            f"event_type: {signal.event_type}\n"
            f"source: {signal.source or 'unknown'}\n"
            f"content: {signal.content}\n"
            f"ip_address: {signal.ip_address or ''}\n"
            f"country: {signal.country or ''}\n"
            f"device: {signal.device or ''}\n"
            f"user_agent: {signal.user_agent or ''}\n"
        )
