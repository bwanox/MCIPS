from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MCIPS AI Service"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    ai_provider_mode: str = "local"
    enable_llm: bool = False
    openrouter_api_key: str = ""
    openrouter_model: str = "qwen/qwen3-next-80b-a3b-instruct:free"
    local_llm_base_url: str = "http://127.0.0.1:11434"
    local_llm_model: str = "llama3.2:3b-instruct-q4_K_M"
    local_llm_timeout_seconds: int = 20
    local_llm_generate_path: str = "/api/generate"
    local_llm_health_path: str = "/api/tags"
    fallback_policy: str = "deterministic"
    request_timeout_seconds: int = 12
    inference_logging_enabled: bool = False
    openrouter_api_url: str = "https://openrouter.ai/api/v1/chat/completions"
    threat_model_path: str = "model-artifacts/threat-classifier/model.pkl"
    service_api_token: str = ""
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @field_validator("openrouter_model")
    @classmethod
    def validate_openrouter_model(cls, value: str) -> str:
        normalized = value.strip()
        if normalized and not normalized.endswith(":free"):
            raise ValueError("OPENROUTER_MODEL must be a free OpenRouter model ending with ':free'")
        return normalized

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.app_env.lower() == "production" and len(self.service_api_token) < 32:
            raise ValueError("SERVICE_API_TOKEN must be at least 32 characters in production")
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
