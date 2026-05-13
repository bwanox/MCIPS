from src.application.services.anomaly_detection_service import AnomalyDetectionService
from src.domain.entities.inference_result import InferenceResult
from src.domain.entities.threat_signal import ThreatSignal


class DetectAnomalyUseCase:
    def __init__(self, anomaly_detection_service: AnomalyDetectionService) -> None:
        self._anomaly_detection_service = anomaly_detection_service

    async def execute(self, signal: ThreatSignal) -> InferenceResult:
        return self._anomaly_detection_service.analyze(signal)
