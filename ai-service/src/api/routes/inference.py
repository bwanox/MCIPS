from fastapi import APIRouter, Depends

from src.api.dependencies.services import get_run_inference_use_case
from src.api.schemas.inference import AnalyzeRequest, AnalyzeResponse
from src.application.use_cases.run_inference import RunInferenceUseCase

router = APIRouter(prefix="/inference", tags=["Inference"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    request: AnalyzeRequest,
    use_case: RunInferenceUseCase = Depends(get_run_inference_use_case),
) -> AnalyzeResponse:
    result = await use_case.execute(request)
    return AnalyzeResponse(
        label=result.label,
        confidence=result.confidence,
        risk=result.risk,
        explanation=result.explanation,
        features=result.features,
        model_used=result.model_used,
        model_version=result.model_version,
        fallback_used=result.fallback_used,
        top_indicators=result.top_indicators,
        url_analysis=result.url_analysis,
    )
