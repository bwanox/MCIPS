#!/usr/bin/env python
"""Train the pilot TF-IDF model and generate an honest out-of-fold evaluation."""
from __future__ import annotations

import csv
import json
import statistics
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sklearn.metrics import (  # noqa: E402
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold  # noqa: E402

from src.application.services.threat_classifier_service import ThreatClassifierService  # noqa: E402
from src.domain.entities.threat_signal import ThreatSignal  # noqa: E402
from src.infrastructure.ml.models.threat_classifier import PhishingThreat, ThreatClassifierModel  # noqa: E402

DATASET = ROOT / "reports" / "data.csv"
ARTIFACT = ROOT / "model-artifacts" / "threat-classifier" / "model.pkl"
REPORT_DIR = ROOT / "reports"


def load_examples() -> list[dict[str, str]]:
    with DATASET.open(encoding="utf-8", newline="") as handle:
        return [row for row in csv.DictReader(handle) if row.get("text")]


def rules_probability(text: str) -> float:
    result = ThreatClassifierService().classify(
        ThreatSignal(event_type="TEXT", content=text, source="evaluation")
    )
    return float(result.component_scores.get("rules_score", 0.0))


def measure_latency(function: Callable[[], Any], repeats: int = 25) -> list[float]:
    samples: list[float] = []
    for _ in range(repeats):
        started = time.perf_counter()
        function()
        samples.append((time.perf_counter() - started) * 1000)
    return samples


def percentile(values: list[float], quantile: float) -> float:
    ordered = sorted(values)
    index = min(len(ordered) - 1, round((len(ordered) - 1) * quantile))
    return round(ordered[index], 4)


def metrics_for(y_true: list[int], probabilities: list[float], threshold: float = 0.5) -> dict[str, Any]:
    predictions = [int(value >= threshold) for value in probabilities]
    matrix = confusion_matrix(y_true, predictions, labels=[0, 1]).tolist()
    return {
        "confusion_matrix": {"labels": ["safe", "phishing"], "values": matrix},
        "accuracy": round(accuracy_score(y_true, predictions), 4),
        "precision": round(precision_score(y_true, predictions, zero_division=0), 4),
        "recall": round(recall_score(y_true, predictions, zero_division=0), 4),
        "f1": round(f1_score(y_true, predictions, zero_division=0), 4),
        "pr_auc": round(average_precision_score(y_true, probabilities), 4),
        "roc_auc": round(roc_auc_score(y_true, probabilities), 4),
        "threshold": threshold,
    }


def evaluate() -> dict[str, Any]:
    examples = load_examples()
    texts = [row["text"] for row in examples]
    labels = [1 if row["label"].strip().lower() in {"phishing", "scam"} else 0 for row in examples]
    languages = [row["language"].strip().lower() for row in examples]

    rules_probabilities = [rules_probability(text) for text in texts]
    ml_probabilities = [0.0] * len(examples)
    folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    for train_indexes, test_indexes in folds.split(texts, labels):
        model = ThreatClassifierModel()
        model.fit(
            [
                PhishingThreat(
                    {
                        "text": texts[index],
                        "language": languages[index],
                        "label": "phishing" if labels[index] else "safe",
                    }
                )
                for index in train_indexes
            ]
        )
        for index in test_indexes:
            result = model.predict(
                PhishingThreat(
                    {
                        "text": texts[index],
                        "language": languages[index],
                        "label": "safe",
                    }
                )
            )
            ml_probabilities[index] = float(result["probability"][1])

    hybrid_probabilities = [
        min(1.0, (0.6 * rules) + (0.4 * ml))
        for rules, ml in zip(rules_probabilities, ml_probabilities, strict=True)
    ]

    final_model = ThreatClassifierModel()
    final_model.fit(
        [
            PhishingThreat(
                {
                    "text": text,
                    "language": language,
                    "label": "phishing" if label else "safe",
                }
            )
            for text, language, label in zip(texts, languages, labels, strict=True)
        ]
    )
    final_model.save(str(ARTIFACT))

    sample = texts[0]
    ml_latency = measure_latency(
        lambda: final_model.predict(PhishingThreat({"text": sample, "language": "english", "label": "safe"}))
    )
    rules_latency = measure_latency(lambda: rules_probability(sample))
    hybrid_latency = [left + right for left, right in zip(rules_latency, ml_latency, strict=True)]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "evaluation_status": "pilot",
        "method": "5-fold stratified out-of-fold evaluation; final artifact trained on all pilot examples",
        "dataset": {
            "size": len(examples),
            "labels": dict(Counter("phishing" if label else "safe" for label in labels)),
            "languages": dict(Counter(languages)),
            "source": "Repository-owned synthetic/curated pilot corpus",
        },
        "models": {
            "rules": {
                **metrics_for(labels, rules_probabilities),
                "latency_ms": {
                    "median": round(statistics.median(rules_latency), 4),
                    "p95": percentile(rules_latency, 0.95),
                },
            },
            "ml": {
                **metrics_for(labels, ml_probabilities),
                "latency_ms": {
                    "median": round(statistics.median(ml_latency), 4),
                    "p95": percentile(ml_latency, 0.95),
                },
            },
            "hybrid": {
                **metrics_for(labels, hybrid_probabilities),
                "latency_ms": {
                    "median": round(statistics.median(hybrid_latency), 4),
                    "p95": percentile(hybrid_latency, 0.95),
                },
            },
        },
        "artifact": str(ARTIFACT.relative_to(ROOT)),
        "limitations": [
            "Only 34 curated pilot messages are evaluated.",
            "Examples are synthetic or manually curated and are not representative of production traffic.",
            "Per-language sample counts are too small for reliable language-specific performance claims.",
            "The artifact is a competition baseline and must not be the sole security control.",
        ],
    }


def markdown(metrics: dict[str, Any]) -> str:
    dataset = metrics["dataset"]
    lines = [
        "# MCIPS Pilot AI Evaluation Report",
        "",
        f"**Generated:** {metrics['generated_at']}",
        "",
        "## Method",
        "",
        metrics["method"] + ".",
        "",
        f"- Dataset size: **{dataset['size']}**",
        f"- Labels: `{json.dumps(dataset['labels'], sort_keys=True)}`",
        f"- Languages: `{json.dumps(dataset['languages'], sort_keys=True)}`",
        "- Status: **pilot, not production validation**",
        "",
        "## Rules vs ML vs Hybrid",
        "",
        "| System | Accuracy | Precision | Recall | F1 | PR-AUC | ROC-AUC | Median ms | p95 ms |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for name in ("rules", "ml", "hybrid"):
        result = metrics["models"][name]
        lines.append(
            f"| {name.title()} | {result['accuracy']:.4f} | {result['precision']:.4f} | "
            f"{result['recall']:.4f} | {result['f1']:.4f} | {result['pr_auc']:.4f} | "
            f"{result['roc_auc']:.4f} | {result['latency_ms']['median']:.4f} | "
            f"{result['latency_ms']['p95']:.4f} |"
        )
    lines.extend(["", "## Confusion Matrices", ""])
    for name in ("rules", "ml", "hybrid"):
        values = metrics["models"][name]["confusion_matrix"]["values"]
        lines.extend(
            [
                f"### {name.title()}",
                "",
                "| Actual / Predicted | Safe | Phishing |",
                "|---|---:|---:|",
                f"| Safe | {values[0][0]} | {values[0][1]} |",
                f"| Phishing | {values[1][0]} | {values[1][1]} |",
                "",
            ]
        )
    lines.extend(["## Limitations", ""])
    lines.extend(f"- {item}" for item in metrics["limitations"])
    lines.extend(
        [
            "",
            "## Conclusion",
            "",
            "The live classifier is an explainable **rules + TF-IDF pilot hybrid**. "
            "These results demonstrate reproducibility, not production readiness.",
            "",
        ]
    )
    return "\n".join(lines)


if __name__ == "__main__":
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    results = evaluate()
    (REPORT_DIR / "evaluation_metrics.json").write_text(
        json.dumps(results, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (REPORT_DIR / "evaluation_report.md").write_text(markdown(results), encoding="utf-8")
    print(json.dumps({"dataset_size": results["dataset"]["size"], "artifact": results["artifact"]}))
