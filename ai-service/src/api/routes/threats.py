from fastapi import APIRouter

from src.api.schemas.threat import ThreatListResponse
from src.application.services.anomaly_detection_service import AnomalyDetectionService
from src.application.services.threat_classifier_service import ThreatClassifierService
from src.domain.enums.risk_level import RiskLevel
from src.domain.enums.threat_label import ThreatLabel

router = APIRouter(prefix="/threats", tags=["Threats"])


@router.get("/labels", response_model=ThreatListResponse)
async def list_labels() -> ThreatListResponse:
    return ThreatListResponse(items=[label.value for label in ThreatLabel])


@router.get("/risk-levels", response_model=ThreatListResponse)
async def list_risk_levels() -> ThreatListResponse:
    return ThreatListResponse(items=[risk.value for risk in RiskLevel])


@router.get("/features", response_model=ThreatListResponse)
async def list_features() -> ThreatListResponse:
    classifier = ThreatClassifierService()
    anomaly = AnomalyDetectionService()
    return ThreatListResponse(items=classifier.feature_catalog() + anomaly.feature_catalog())
