from __future__ import annotations

import re

from src.application.use_cases.score_threat import ScoreThreatUseCase
from src.domain.entities.inference_result import InferenceResult
from src.domain.entities.threat_signal import ThreatSignal
from src.domain.enums.threat_label import ThreatLabel
from src.infrastructure.ml.preprocessing.normalize import normalize_text


class ThreatClassifierService:
    FEATURE_WEIGHTS: dict[str, int] = {
        "suspicious_link": 25,
        "urgent_tone": 20,
        "financial_request": 20,
        "credential_request": 25,
        "otp_request": 25,
        "prize_scam": 25,
        "toxic_language": 35,
        "account_blocked_claim": 20,
    }

    URL_PATTERN = re.compile(
        r"(https?://|www\.|bit\.ly|tinyurl|t\.co|goo\.gl|rebrand\.ly|[a-z0-9-]+\.(com|net|org|ma|info|co)(/|\b))",
        re.IGNORECASE,
    )

    URGENT_KEYWORDS = {
        "urgent",
        "immediately",
        "now",
        "asap",
        "attention",
        "alert",
        "final notice",
        "last warning",
        "immediatement",
        "immédiatement",
        "vite",
        "maintenant",
        "alerte",
        "dernier avertissement",
        "عاجل",
        "دابا",
        "حالاً",
        "فوراً",
    }
    FINANCIAL_KEYWORDS = {
        "bank",
        "banking",
        "banque",
        "bancaire",
        "account",
        "compte",
        "card",
        "carte",
        "payment",
        "paiement",
        "transaction",
        "transfer",
        "virement",
        "wallet",
        "rib",
        "solde",
        "cih",
        "attijari",
        "attijariwafa",
        "wafabank",
        "bmce",
        "bank of africa",
        "barid bank",
        "barid",
        "cashplus",
        "inwi money",
        "orange money",
        "bank al maghrib",
        "بنك",
        "حساب",
        "بطاقة",
        "تحويل",
        "دفع",
        "سي اي اش",
        "بريد بنك",
    }
    CREDENTIAL_KEYWORDS = {
        "password",
        "passcode",
        "login",
        "username",
        "credential",
        "credentials",
        "identity",
        "verify identity",
        "verify your identity",
        "identifiant",
        "mot de passe",
        "code secret",
        "vérifier votre identité",
        "verifier votre identite",
        "identité",
        "identite",
        "كلمة المرور",
        "اسم المستخدم",
        "الهوية",
        "تأكيد الهوية",
    }
    OTP_KEYWORDS = {
        "otp",
        "one-time password",
        "verification code",
        "security code",
        "code de verification",
        "code de vérification",
        "code otp",
        "sms code",
        "رمز التحقق",
        "كود التفعيل",
        "code recu",
        "code reçu",
    }
    PRIZE_KEYWORDS = {
        "won",
        "winner",
        "reward",
        "gift",
        "lottery",
        "prize",
        "free iphone",
        "cash reward",
        "félicitations",
        "felicitations",
        "gagné",
        "gagne",
        "cadeau",
        "récompense",
        "recompense",
        "jackpot",
        "ربحت",
        "جائزة",
        "هدية",
    }
    TOXIC_KEYWORDS = {
        "kill yourself",
        "i hate you",
        "die",
        "idiot",
        "stupid",
        "moron",
        "hate speech",
        "suicide",
        "سير موت",
        "موت",
        "حمار",
        "كلب",
        "غبي",
        "أكرهك",
    }
    ACCOUNT_BLOCKED_KEYWORDS = {
        "account blocked",
        "account suspended",
        "account locked",
        "compte bloque",
        "compte bloqué",
        "compte suspendu",
        "carte bloquee",
        "carte bloquée",
        "your account is blocked",
        "suspended account",
        "تم حظر حسابك",
        "تم توقيف حسابك",
        "حسابك موقوف",
    }

    FEATURE_EXPLANATIONS: dict[str, str] = {
        "suspicious_link": "a suspicious link or shortened URL",
        "urgent_tone": "urgent or pressure-based wording",
        "financial_request": "banking, payment, or Moroccan financial context",
        "credential_request": "a request for passwords, identity, or credentials",
        "otp_request": "a request for OTP or verification codes",
        "prize_scam": "fake reward, prize, or lottery language",
        "toxic_language": "toxic or harmful language",
        "account_blocked_claim": "an account blocked or suspended claim",
    }

    def classify(self, signal: ThreatSignal) -> InferenceResult:
        content = signal.content or ""
        normalized = normalize_text(content)
        features = self._extract_features(content, normalized)
        score = sum(self.FEATURE_WEIGHTS[feature] for feature in features)
        label = self._determine_label(score, features)
        risk = ScoreThreatUseCase.risk_from_score(score)
        confidence = ScoreThreatUseCase.confidence_from_score(score)
        explanation = self._build_explanation(label, features)

        return InferenceResult(
            label=label,
            confidence=confidence,
            risk=risk,
            explanation=explanation,
            features=features,
            model_used="local_rules_v1",
            fallback_used=True,
        )

    def feature_catalog(self) -> list[str]:
        return list(self.FEATURE_WEIGHTS.keys())

    def _extract_features(self, raw_content: str, normalized: str) -> list[str]:
        features: list[str] = []
        if self.URL_PATTERN.search(raw_content):
            features.append("suspicious_link")
        if self._contains_any(normalized, self.URGENT_KEYWORDS):
            features.append("urgent_tone")
        if self._contains_any(normalized, self.FINANCIAL_KEYWORDS):
            features.append("financial_request")
        if self._contains_any(normalized, self.CREDENTIAL_KEYWORDS):
            features.append("credential_request")
        if self._contains_any(normalized, self.OTP_KEYWORDS):
            features.append("otp_request")
        if self._contains_any(normalized, self.PRIZE_KEYWORDS):
            features.append("prize_scam")
        if self._contains_any(normalized, self.TOXIC_KEYWORDS):
            features.append("toxic_language")
        if self._contains_any(normalized, self.ACCOUNT_BLOCKED_KEYWORDS):
            features.append("account_blocked_claim")
        return features

    def _determine_label(self, score: int, features: list[str]) -> ThreatLabel:
        if "toxic_language" in features:
            return ThreatLabel.TOXIC
        if "financial_request" in features and any(
            feature in features
            for feature in ("suspicious_link", "credential_request", "otp_request", "account_blocked_claim")
        ):
            return ThreatLabel.PHISHING
        if "prize_scam" in features:
            return ThreatLabel.SCAM
        if score >= 60:
            return ThreatLabel.PHISHING
        if score >= 35:
            return ThreatLabel.SUSPICIOUS
        return ThreatLabel.SAFE

    def _build_explanation(self, label: ThreatLabel, features: list[str]) -> str:
        if not features:
            return f"Classified as {label.value} because no suspicious indicators were detected."
        reasons = [self.FEATURE_EXPLANATIONS.get(feature, feature) for feature in features]
        return f"Classified as {label.value} because it contains " + ", ".join(reasons) + "."

    @staticmethod
    def _contains_any(normalized: str, keywords: set[str]) -> bool:
        return any(keyword in normalized for keyword in keywords)
