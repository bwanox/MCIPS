from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_health_returns_healthy() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["active_reasoning_mode"] in {"local", "cloud", "fallback"}
    assert "local_model_reachable" in response.json()
