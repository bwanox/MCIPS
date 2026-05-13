from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MCIPS AI Service"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    enable_llm: bool = False
    openrouter_api_key: str = ""
    openrouter_model: str = "qwen/qwen3-next-80b-a3b-instruct:free"
    request_timeout_seconds: int = 12
    inference_logging_enabled: bool = False
    openrouter_api_url: str = "https://openrouter.ai/api/v1/chat/completions"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
