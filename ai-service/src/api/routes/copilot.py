from fastapi import APIRouter, Depends

from src.api.dependencies.services import get_reasoning_service
from src.api.schemas.copilot import (
    CopilotAnswerRequest,
    CopilotAnswerResponse,
    IncidentReasoningRequest,
    IncidentReasoningResponse,
    IncidentSummarizeRequest,
    IncidentSummarizeResponse,
)
from src.application.services.reasoning_service import ReasoningService

router = APIRouter(tags=["Copilot"])


@router.post("/incidents/summarize", response_model=IncidentSummarizeResponse)
async def summarize_incident(
    request: IncidentSummarizeRequest,
    reasoning_service: ReasoningService = Depends(get_reasoning_service),
) -> IncidentSummarizeResponse:
    result = await reasoning_service.summarize_incident(request.model_dump())
    return IncidentSummarizeResponse(
        summary=str(result["summary"]).strip(),
        model_used=str(result["model_used"]),
        fallback_used=bool(result["fallback_used"]),
    )


@router.post("/incidents/reason", response_model=IncidentReasoningResponse)
async def reason_incident(
    request: IncidentReasoningRequest,
    reasoning_service: ReasoningService = Depends(get_reasoning_service),
) -> IncidentReasoningResponse:
    result = await reasoning_service.summarize_incident(request.model_dump())
    actions = result.get("recommended_actions", [])
    if not isinstance(actions, list):
        actions = []
    return IncidentReasoningResponse(
        summary=str(result["summary"]).strip(),
        recommended_actions=[str(action).strip() for action in actions if str(action).strip()],
        approval_required=bool(result["approval_required"]),
        approval_reason=str(result["approval_reason"]).strip(),
        model_used=str(result["model_used"]),
        fallback_used=bool(result["fallback_used"]),
    )


@router.post("/copilot/answer", response_model=CopilotAnswerResponse)
async def answer_copilot(
    request: CopilotAnswerRequest,
    reasoning_service: ReasoningService = Depends(get_reasoning_service),
) -> CopilotAnswerResponse:
    result = await reasoning_service.answer_copilot(request.model_dump())
    return CopilotAnswerResponse(
        answer=str(result["answer"]).strip(),
        model_used=str(result["model_used"]),
        fallback_used=bool(result["fallback_used"]),
    )
