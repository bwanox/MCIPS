from fastapi.testclient import TestClient

from src.main import app
from src.infrastructure.config.settings import get_settings
from src.infrastructure.llm.openrouter_client import OpenRouterClient

client = TestClient(app)


def _post(payload: dict) -> dict:
    response = client.post("/api/v1/inference/analyze", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def test_safe_sms_returns_safe_low() -> None:
    data = _post({"type": "SMS", "content": "Bonjour, votre rendez-vous est confirme demain a 10h."})
    assert data["label"] == "safe"
    assert data["risk"] == "LOW"


def test_phishing_cih_sms_returns_phishing_high() -> None:
    payload = {
        "type": "SMS",
        "content": "CIH Bank: votre compte est bloque. Verifiez votre mot de passe et code OTP maintenant sur https://cih-secure-alert.com",
        "source": "sms-gateway",
    }
    data = _post(payload)
    assert data["label"] == "phishing"
    assert data["risk"] == "HIGH"
    assert "financial_request" in data["features"]
    assert "credential_request" in data["features"]


def test_prize_scam_returns_scam() -> None:
    data = _post(
        {
            "type": "TEXT",
            "content": "Felicitations! Vous avez gagne un cash reward exclusif, cliquez sur http://promo-winner.com maintenant.",
        }
    )
    assert data["label"] == "scam"
    assert data["risk"] in {"MEDIUM", "HIGH"}


def test_suspicious_login_returns_high() -> None:
    data = _post(
        {
            "type": "LOGIN_ATTEMPT",
            "content": "Login attempt detected",
            "country": "Russia",
            "ip_address": "185.220.101.1",
            "device": "Unknown device",
            "user_agent": "curl/8.0 bot",
        }
    )
    assert data["label"] == "suspicious_login"
    assert data["risk"] == "HIGH"


def test_invalid_event_type_rejected() -> None:
    response = client.post("/api/v1/inference/analyze", json={"type": "VOICE", "content": "test"})
    assert response.status_code == 422


def test_empty_content_rejected() -> None:
    response = client.post("/api/v1/inference/analyze", json={"type": "SMS", "content": "   "})
    assert response.status_code == 422


def test_qwen_disabled_fallback_works() -> None:
    settings = get_settings()
    settings.enable_llm = False
    settings.openrouter_api_key = ""
    data = _post({"type": "TEXT", "content": "Hello team, meeting moved to tomorrow."})
    assert data["fallback_used"] is True
    assert data["model_used"] == "local_rules_v1"


def test_invalid_qwen_json_falls_back_to_local(monkeypatch) -> None:
    settings = get_settings()
    settings.enable_llm = True
    settings.openrouter_api_key = "test-key"

    async def fake_complete_json(self, system_prompt: str, user_prompt: str) -> str:
        return "not-json"

    monkeypatch.setattr(OpenRouterClient, "complete_json", fake_complete_json)
    data = _post({"type": "TEXT", "content": "Bonjour, votre facture est disponible."})
    assert data["fallback_used"] is True
    assert data["model_used"] == "local_rules_v1"

    settings.enable_llm = False
    settings.openrouter_api_key = ""
