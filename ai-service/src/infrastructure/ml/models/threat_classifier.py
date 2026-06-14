"""
Multilingual Phishing Threat Classifier
Supports English, French, Arabic, and Moroccan Darija
"""
from __future__ import annotations

import pickle
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

LABEL_MAPPING = {"phishing": 1, "safe": 0, "scam": 1}
LANGUAGE_MAPPING = {"english": 0, "french": 1, "arabic": 2, "darija": 3}


class PhishingThreat:
    """Data class for phishing threat training example"""
    def __init__(self, data: dict[str, Any]):
        self.text = str(data.get("text", "")).lower().strip()
        label_str = str(data.get("label", "safe")).lower().strip()
        self.label = LABEL_MAPPING.get(label_str, 0)
        lang_str = str(data.get("language", "english")).lower().strip()
        self.language = LANGUAGE_MAPPING.get(lang_str, 0)


class ThreatClassifierModel:
    """ML-based threat classifier for multilingual phishing detection"""
    
    def __init__(self):
        self.model = LogisticRegression(max_iter=1000, random_state=42, n_jobs=-1)
        self.vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2), lowercase=True)
        self.is_trained = False
        self.metrics = {}

    def train(self, data: list[PhishingThreat]) -> dict[str, Any]:
        """Train the model and return metrics"""
        if not data:
            raise ValueError("Training data cannot be empty")
            
        labels = [d.label for d in data]
        texts = [d.text for d in data]
        
        X_train, X_test, y_train, y_test = train_test_split(
            texts, labels, test_size=0.2, random_state=42
        )
        
        X_train_vec = self.vectorizer.fit_transform(X_train)
        X_test_vec = self.vectorizer.transform(X_test)
        
        self.model.fit(X_train_vec, y_train)
        
        y_pred = self.model.predict(X_test_vec)
        y_pred_proba = self.model.predict_proba(X_test_vec)[:, 1]
        
        self.metrics = {
            "accuracy": round(accuracy_score(y_test, y_pred), 4),
            "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
            "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
            "f1": round(f1_score(y_test, y_pred, zero_division=0), 4),
            "roc_auc": round(roc_auc_score(y_test, y_pred_proba), 4),
            "samples": len(data),
        }
        
        self.is_trained = True
        return self.metrics

    def predict(self, data: PhishingThreat) -> dict[str, Any]:
        """Predict threat label and confidence"""
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        if not data.text:
            return {"prediction": "safe", "confidence": 0.0, "probability": [0.0, 0.0]}
            
        X = self.vectorizer.transform([data.text])
        prediction = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        
        label = "phishing" if prediction == 1 else "safe"
        confidence = round(max(probabilities), 4)
        
        return {
            "prediction": label,
            "confidence": confidence,
            "probability": [round(p, 4) for p in probabilities],
            "language": list(LANGUAGE_MAPPING.keys())[data.language] if data.language in LANGUAGE_MAPPING.values() else "unknown"
        }

    def save(self, filepath: str) -> None:
        """Save model and vectorizer to disk"""
        with open(filepath.replace(".pkl", "_vectorizer.pkl"), "wb") as f:
            pickle.dump(self.vectorizer, f)
        with open(filepath, "wb") as f:
            pickle.dump(self.model, f)

    def load(self, filepath: str) -> None:
        """Load model and vectorizer from disk"""
        with open(filepath.replace(".pkl", "_vectorizer.pkl"), "rb") as f:
            self.vectorizer = pickle.load(f)
        with open(filepath, "rb") as f:
            self.model = pickle.load(f)
        self.is_trained = True


# Export for backward compatibility
ThreatClassifierService = ThreatClassifierModel

