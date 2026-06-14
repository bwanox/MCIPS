from functools import lru_cache

from src.application.services.anomaly_detection_service import AnomalyDetectionService
from src.application.services.hybrid_ai_service import HybridAIService
from src.application.services.ml_threat_classifier_service import MlThreatClassifierService
from src.application.services.reasoning_service import ReasoningService
from src.application.services.threat_classifier_service import ThreatClassifierService
from src.application.use_cases.detect_anomaly import DetectAnomalyUseCase
from src.application.use_cases.run_inference import RunInferenceUseCase
from src.infrastructure.config.settings import get_settings
from src.infrastructure.llm.local_model_client import LocalModelClient
from src.infrastructure.llm.openrouter_client import OpenRouterClient
from src.infrastructure.repositories.inference_log_repository import InferenceLogRepository


@lru_cache
def get_threat_classifier_service() -> ThreatClassifierService:
    return ThreatClassifierService()


@lru_cache
def get_anomaly_detection_service() -> AnomalyDetectionService:
    return AnomalyDetectionService()


@lru_cache
def get_hybrid_ai_service() -> HybridAIService:
    settings = get_settings()
    return HybridAIService(
        classifier=get_threat_classifier_service(),
        settings=settings,
        ml_classifier=MlThreatClassifierService(settings.threat_model_path),
    )


@lru_cache
def get_reasoning_service() -> ReasoningService:
    settings = get_settings()
    local_client = LocalModelClient(settings) if settings.local_llm_base_url and settings.local_llm_model else None
    cloud_client = OpenRouterClient(settings) if settings.openrouter_api_key else None
    return ReasoningService(settings=settings, local_client=local_client, cloud_client=cloud_client)


@lru_cache
def get_run_inference_use_case() -> RunInferenceUseCase:
    settings = get_settings()
    anomaly_service = get_anomaly_detection_service()
    return RunInferenceUseCase(
        hybrid_ai_service=get_hybrid_ai_service(),
        detect_anomaly_use_case=DetectAnomalyUseCase(anomaly_service),
        inference_log_repository=InferenceLogRepository(settings),
    )
