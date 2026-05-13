from src.api.schemas.inference import AnalyzeRequest, EventType
from src.application.services.hybrid_ai_service import HybridAIService
from src.application.use_cases.detect_anomaly import DetectAnomalyUseCase
from src.domain.entities.inference_result import InferenceResult
from src.domain.entities.threat_signal import ThreatSignal
from src.infrastructure.repositories.inference_log_repository import InferenceLogRepository


class RunInferenceUseCase:
    def __init__(
        self,
        hybrid_ai_service: HybridAIService,
        detect_anomaly_use_case: DetectAnomalyUseCase,
        inference_log_repository: InferenceLogRepository,
    ) -> None:
        self._hybrid_ai_service = hybrid_ai_service
        self._detect_anomaly_use_case = detect_anomaly_use_case
        self._inference_log_repository = inference_log_repository

    async def execute(self, request: AnalyzeRequest) -> InferenceResult:
        signal = ThreatSignal(
            event_type=request.type.value,
            content=request.content,
            source=request.source,
            ip_address=request.ip_address,
            country=request.country,
            device=request.device,
            user_agent=request.user_agent,
        )
        if request.type is EventType.LOGIN_ATTEMPT:
            result = await self._detect_anomaly_use_case.execute(signal)
        else:
            result = await self._hybrid_ai_service.analyze(signal)
        await self._inference_log_repository.log(signal, result)
        return result
