from fastapi import APIRouter, Depends

from src.api.dependencies.services import get_reasoning_service
from src.api.schemas.health import HealthResponse
from src.application.services.reasoning_service import ReasoningService
from src.infrastructure.config.settings import get_settings

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(reasoning_service: ReasoningService = Depends(get_reasoning_service)) -> HealthResponse:
    settings = get_settings()
    local_model_reachable = await reasoning_service.local_model_reachable()
    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        environment=settings.app_env,
        active_reasoning_mode=reasoning_service.active_reasoning_mode(),
        fallback_mode=settings.fallback_policy,
        local_model_reachable=local_model_reachable,
    )
