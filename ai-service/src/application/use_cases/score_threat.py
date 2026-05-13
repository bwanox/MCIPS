from src.domain.enums.risk_level import RiskLevel


class ScoreThreatUseCase:
    @staticmethod
    def risk_from_score(score: int) -> RiskLevel:
        if score >= 70:
            return RiskLevel.HIGH
        if score >= 35:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    @staticmethod
    def confidence_from_score(score: int) -> float:
        confidence = 0.50 + min(score, 100) * 0.0048
        confidence = max(0.0, min(confidence, 0.98))
        return round(confidence, 2)
