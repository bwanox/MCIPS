"""
Inference Pipeline
Orchestrates model predictions and feature extraction
"""
from __future__ import annotations

from typing import Any

from src.infrastructure.ml.models.threat_classifier import ThreatClassifierModel, PhishingThreat
from src.infrastructure.ml.models.anomaly_detector import LoginAnomalyDetector, NetworkIntrusionDetector
from src.infrastructure.ml.pipelines.feature_pipeline import URLFeatureExtractor, EventFeatureExtractor


class InferencePipeline:
    """Main inference pipeline combining all models"""
    
    def __init__(self):
        self.threat_classifier = ThreatClassifierModel()
        self.login_anomaly = LoginAnomalyDetector()
        self.network_ids = NetworkIntrusionDetector()
        self.url_extractor = URLFeatureExtractor()
        self.event_extractor = EventFeatureExtractor()
        
    def predict_phishing(self, text: str, language: str = "english") -> dict[str, Any]:
        """Predict if text is phishing"""
        try:
            if not self.threat_classifier.is_trained:
                return None
            
            threat = PhishingThreat({
                "text": text,
                "language": language,
                "label": "safe"  # Placeholder for inference
            })
            
            result = self.threat_classifier.predict(threat)
            
            # Add message features
            features = self.event_extractor.extract_message_features(text)
            result["message_features"] = features
            
            return result
        except Exception as e:
            return {"error": str(e), "model": "phishing"}
    
    def predict_url_risk(self, url: str) -> dict[str, Any]:
        """Predict URL risk score"""
        try:
            self.url_extractor.extract_features(url)
            risk_result = self.url_extractor.calculate_risk_score()
            return risk_result
        except Exception as e:
            return {"error": str(e), "model": "url_risk"}
    
    def predict_login_anomaly(self, login_data: dict[str, Any]) -> dict[str, Any]:
        """Predict login anomaly score"""
        try:
            return self.login_anomaly.predict(login_data)
        except Exception as e:
            return {"error": str(e), "model": "login_anomaly"}
    
    def predict_network_intrusion(self, event_data: dict[str, Any]) -> dict[str, Any]:
        """Predict network intrusion type"""
        try:
            return self.network_ids.predict(event_data)
        except Exception as e:
            return {"error": str(e), "model": "network_ids"}
    
    def predict_combined(self, text: str, urls: list[str] | None = None) -> dict[str, Any]:
        """Combined prediction with all models"""
        results = {
            "phishing": self.predict_phishing(text),
            "urls": [],
            "model_versions": {
                "phishing": "phishing_tfidf_v1",
                "url": "url_risk_v1",
                "login": "login_anomaly_v1",
                "network": "network_ids_v1",
            }
        }
        
        if urls:
            for url in urls:
                results["urls"].append(self.predict_url_risk(url))
        
        return results
