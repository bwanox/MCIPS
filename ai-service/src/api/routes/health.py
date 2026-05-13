from fastapi import APIRouter

from src.api.schemas.health import HealthResponse
from src.infrastructure.config.settings import get_settings

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        environment=settings.app_env,
    )
