from __future__ import annotations

import json
from json import JSONDecodeError
from typing import Any

import httpx

from src.domain.interfaces.reasoning_gateway import ReasoningGateway
from src.infrastructure.config.settings import Settings


class ReasoningService:
    def __init__(
        self,
        settings: Settings,
        local_client: ReasoningGateway | None = None,
        cloud_client: ReasoningGateway | None = None,
    ) -> None:
        self._settings = settings
        self._local_client = local_client
        self._cloud_client = cloud_client

    async def summarize_incident(self, request: dict[str, Any]) -> dict[str, Any]:
        fallback = self._fallback_reasoning(request)
        result = await self._reason(
            system_prompt=(
                "You are the MCIPS SecureLens cyber copilot. Return ONLY valid JSON with fields "
                "summary, recommended_actions, approval_required, approval_reason. "
                "Keep outputs concise, analyst-friendly, and based only on provided sanitized context."
            ),
            user_prompt=(
                f"incident_id: {request['incidentId']}\n"
                f"title: {request['title']}\n"
                f"summary: {request['summary']}\n"
                f"recommended_actions_seed: {', '.join(request.get('recommendedActions', []))}\n"
                f"signals: {json.dumps(request.get('signals', []))}\n"
            ),
            fallback=fallback,
        )
        return result

    async def answer_copilot(self, request: dict[str, Any]) -> dict[str, Any]:
        fallback_answer = self._fallback_answer(request)
        result = await self._reason(
            system_prompt=(
                "You are the MCIPS SecureLens copilot. Return ONLY valid JSON with a single field "
                "answer. Answer using only the sanitized incident context and stay concise."
            ),
            user_prompt=(
                f"incident_id: {request['incidentId']}\n"
                f"summary: {request['summary']}\n"
                f"source_families: {', '.join(request.get('sourceFamilies', []))}\n"
                f"recommended_actions: {', '.join(request.get('recommendedActions', []))}\n"
                f"timeline: {json.dumps(request.get('timeline', []))}\n"
                f"question: {request['question']}\n"
            ),
            fallback={
                "answer": fallback_answer,
            },
        )
        return result

    async def _reason(self, system_prompt: str, user_prompt: str, fallback: dict[str, Any]) -> dict[str, Any]:
        mode = self._settings.ai_provider_mode.lower()

        providers: list[tuple[str, Any | None]] = []
        if mode == "local":
            providers = [("local_model", self._local_client), ("cloud_model", self._cloud_client)]
        elif mode == "cloud":
            providers = [("cloud_model", self._cloud_client), ("local_model", self._local_client)]
        elif mode == "fallback":
            providers = []
        else:
            providers = [("local_model", self._local_client), ("cloud_model", self._cloud_client)]

        for provider_name, provider in providers:
            if provider is None:
                continue
            try:
                payload = await provider.complete_json(system_prompt, user_prompt)
                parsed = json.loads(payload)
                if not isinstance(parsed, dict):
                    raise ValueError("model response must be an object")
                return {
                    **parsed,
                    "model_used": self._provider_model_name(provider_name),
                    "fallback_used": False,
                    "source": provider_name,
                }
            except (httpx.HTTPError, TimeoutError, JSONDecodeError, KeyError, TypeError, ValueError):
                continue

        return {
            **fallback,
            "model_used": "deterministic_fallback_v1",
            "fallback_used": True,
            "source": "deterministic_fallback",
        }

    async def local_model_reachable(self) -> bool:
        if self._local_client is None or self._settings.ai_provider_mode.lower() == "fallback":
            return False

        try:
            return await self._local_client.health_check()
        except (httpx.HTTPError, TimeoutError, ValueError):
            return False

    def active_reasoning_mode(self) -> str:
        mode = self._settings.ai_provider_mode.lower()
        if mode in {"local", "cloud", "fallback"}:
            return mode
        return "local"

    def _provider_model_name(self, provider_name: str) -> str:
        if provider_name == "local_model":
            return self._settings.local_llm_model
        return self._settings.openrouter_model

    def _fallback_reasoning(self, request: dict[str, Any]) -> dict[str, Any]:
        signal_labels = ", ".join(signal["label"] for signal in request.get("signals", [])[:3]) or "related suspicious activity"
        actions = request.get("recommendedActions", [])[:3]
        summary = (
            f"{request['title']}. {request['summary']} "
            f"Signals observed include {signal_labels}. "
            f"Recommended next steps: {', '.join(actions) or 'review the incident in the dashboard'}."
        ).strip()
        recommended_actions = actions or ["Review the incident timeline and notify the administrator."]
        approval_required = any("password reset" in action.lower() for action in recommended_actions)
        approval_reason = (
            "Password reset or account access changes should be approved by an operator."
            if approval_required
            else "The recommended actions are advisory and do not require approval."
        )
        return {
            "summary": summary,
            "recommended_actions": recommended_actions,
            "approval_required": approval_required,
            "approval_reason": approval_reason,
        }

    def _fallback_answer(self, request: dict[str, Any]) -> str:
        question = request["question"].lower()
        if "why" in question:
            return (
                f"This incident was escalated because SecureLens correlated {', '.join(request.get('sourceFamilies', [])) or 'multiple'} "
                f"signals around the same timeline. Summary: {request['summary']}"
            )
        if "first" in question or "do" in question:
            return (
                f"Start with these actions: {', '.join(request.get('recommendedActions', [])[:3]) or 'review the timeline and notify the admin'}."
            )
        if "management" in question or "summarize" in question:
            return f"Management summary: {request['summary']}"
        return (
            f"Incident {request['incidentId']} involves {', '.join(request.get('sourceFamilies', [])) or 'multiple'} signals. "
            f"Recommended actions: {', '.join(request.get('recommendedActions', [])[:3]) or 'review the incident'}."
        )
