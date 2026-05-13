from enum import Enum


class ThreatLabel(str, Enum):
    PHISHING = "phishing"
    SCAM = "scam"
    SAFE = "safe"
    TOXIC = "toxic"
    SUSPICIOUS = "suspicious"
    SUSPICIOUS_LOGIN = "suspicious_login"
