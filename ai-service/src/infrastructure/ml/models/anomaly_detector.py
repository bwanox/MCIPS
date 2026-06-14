"""
Login Anomaly Detection Model
Detects suspicious login patterns using feature-based scoring
"""
from __future__ import annotations

from ipaddress import ip_address
from typing import Any

import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest


class LoginAnomalyDetector:
    """ML-based login anomaly detector for suspicious activity"""
    
    FEATURE_WEIGHTS = {
        "unknown_country": 35,
        "suspicious_ip_prefix": 30,
        "unknown_device": 20,
        "suspicious_user_agent": 15,
        "impossible_travel": 40,
        "unusual_hour": 10,
    }
    
    HIGH_RISK_COUNTRIES = {
        "russia", "north korea", "iran", "belarus", "unknown", "china"
    }
    SUSPICIOUS_IP_PREFIXES = ("45.", "46.", "91.", "103.", "176.", "185.", "188.", "193.")
    UNKNOWN_DEVICE_MARKERS = {"unknown", "new device", "unrecognized", "generic", "other"}
    BOT_USER_AGENT_MARKERS = {"curl", "python", "bot", "scrapy", "wget", "headless", "postman"}
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.is_trained = False
        self.feature_names = list(self.FEATURE_WEIGHTS.keys())
        
    def extract_features(self, login_data: dict[str, Any]) -> dict[str, int]:
        """Extract numerical features from login attempt"""
        features = {}
        
        country = (login_data.get("country") or "").strip().lower()
        device = (login_data.get("device") or "").strip().lower()
        user_agent = (login_data.get("user_agent") or "").strip().lower()
        ip_value = (login_data.get("ip_address") or "").strip()
        hour = login_data.get("hour", 12)  # Default to noon
        
        # Country feature
        features["unknown_country"] = 1 if country in self.HIGH_RISK_COUNTRIES else 0
        
        # IP feature
        features["suspicious_ip_prefix"] = 1 if self._is_suspicious_ip(ip_value) else 0
        
        # Device feature
        features["unknown_device"] = 1 if any(m in device for m in self.UNKNOWN_DEVICE_MARKERS) else 0
        
        # User agent feature
        features["suspicious_user_agent"] = 1 if any(m in user_agent for m in self.BOT_USER_AGENT_MARKERS) else 0
        
        # Impossible travel (simplified: flag if multiple countries in short time)
        features["impossible_travel"] = login_data.get("impossible_travel", 0)
        
        # Unusual hour (outside 8am-10pm)
        features["unusual_hour"] = 1 if hour < 8 or hour > 22 else 0
        
        return features
    
    def score_features(self, features: dict[str, int]) -> tuple[int, list[str]]:
        """Score features and return total score and active features"""
        score = sum(
            self.FEATURE_WEIGHTS[key] * value for key, value in features.items()
        )
        active_features = [key for key, value in features.items() if value > 0]
        return score, active_features
    
    def predict(self, login_data: dict[str, Any]) -> dict[str, Any]:
        """Predict anomaly score and label"""
        features = self.extract_features(login_data)
        score, active_features = self.score_features(features)
        
        # Determine risk level
        if score >= 60:
            label = "suspicious_login"
            risk = "HIGH"
            confidence = min(0.99, 0.5 + (score / 100))
        elif score >= 35:
            label = "suspicious"
            risk = "MEDIUM"
            confidence = 0.5 + (score / 150)
        else:
            label = "normal_login"
            risk = "LOW"
            confidence = 0.3 + (score / 200)
        
        return {
            "label": label,
            "risk": risk,
            "confidence": round(confidence, 4),
            "score": score,
            "active_features": active_features,
            "all_features": features,
            "model_used": "login_anomaly_v1",
        }
    
    def _is_suspicious_ip(self, ip_str: str) -> bool:
        """Check if IP is suspicious"""
        if not ip_str:
            return False
        try:
            ip_address(ip_str)
            return ip_str.startswith(self.SUSPICIOUS_IP_PREFIXES)
        except ValueError:
            return True


class NetworkIntrusionDetector:
    """Network-based intrusion detection using traffic patterns"""
    
    LABELS = ["normal", "port_scan", "ddos", "brute_force", "botnet", "intrusion"]
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.model = IsolationForest(contamination=0.15, random_state=42)
        self.is_trained = False
        
    def extract_features(self, event_data: dict[str, Any]) -> np.ndarray:
        """Extract numerical features from network event"""
        packet_count = event_data.get("packet_count", 0)
        byte_count = event_data.get("byte_count", 0)
        unique_ports = event_data.get("unique_ports", 0)
        protocol_variance = event_data.get("protocol_variance", 0)
        duration_ms = event_data.get("duration_ms", 1000)
        
        features = [
            packet_count,
            byte_count,
            unique_ports,
            protocol_variance,
            packet_count / max(duration_ms / 1000, 1),  # packets per second
            byte_count / max(packet_count, 1),  # bytes per packet
        ]
        
        return np.array(features).reshape(1, -1)
    
    def predict(self, event_data: dict[str, Any]) -> dict[str, Any]:
        """Predict network threat label"""
        features = self.extract_features(event_data)
        
        # Simple heuristic-based classification
        packet_count = event_data.get("packet_count", 0)
        unique_ports = event_data.get("unique_ports", 0)
        byte_count = event_data.get("byte_count", 0)
        duration_ms = event_data.get("duration_ms", 1000)
        
        if unique_ports > 100 and packet_count > 1000:
            label = "port_scan"
            confidence = 0.85
        elif packet_count / max(duration_ms / 1000, 1) > 10000:
            label = "ddos"
            confidence = 0.90
        elif packet_count > 500 and byte_count < 1000:
            label = "brute_force"
            confidence = 0.75
        else:
            label = "normal"
            confidence = 0.95
        
        return {
            "label": label,
            "confidence": confidence,
            "score": min(0.99, confidence),
            "model_used": "network_ids_v1",
        }
