from src.application.services.anomaly_detection_service import AnomalyDetectionService
from src.application.services.hybrid_ai_service import HybridAIService
from src.application.services.threat_classifier_service import ThreatClassifierService
from src.application.use_cases.detect_anomaly import DetectAnomalyUseCase
from src.application.use_cases.run_inference import RunInferenceUseCase
from src.infrastructure.config.settings import get_settings
from src.infrastructure.llm.openrouter_client import OpenRouterClient
from src.infrastructure.llm.qwen_gateway import QwenGateway
from src.infrastructure.repositories.inference_log_repository import InferenceLogRepository


def get_threat_classifier_service() -> ThreatClassifierService:
    return ThreatClassifierService()


def get_anomaly_detection_service() -> AnomalyDetectionService:
    return AnomalyDetectionService()


def get_hybrid_ai_service() -> HybridAIService:
    settings = get_settings()
    llm_gateway = None
    if settings.enable_llm and settings.openrouter_api_key:
        llm_gateway = QwenGateway(OpenRouterClient(settings))
    return HybridAIService(
        classifier=get_threat_classifier_service(),
        settings=settings,
        llm_gateway=llm_gateway,
    )


def get_run_inference_use_case() -> RunInferenceUseCase:
    settings = get_settings()
    anomaly_service = get_anomaly_detection_service()
    return RunInferenceUseCase(
        hybrid_ai_service=get_hybrid_ai_service(),
        detect_anomaly_use_case=DetectAnomalyUseCase(anomaly_service),
        inference_log_repository=InferenceLogRepository(settings),
    )
