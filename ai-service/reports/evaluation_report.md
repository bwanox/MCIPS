# MCIPS Pilot AI Evaluation Report

**Generated:** 2026-06-14T20:46:59.820970+00:00

## Method

5-fold stratified out-of-fold evaluation; final artifact trained on all pilot examples.

- Dataset size: **34**
- Labels: `{"phishing": 17, "safe": 17}`
- Languages: `{"arabic": 8, "darija": 6, "english": 12, "french": 8}`
- Status: **pilot, not production validation**

## Rules vs ML vs Hybrid

| System | Accuracy | Precision | Recall | F1 | PR-AUC | ROC-AUC | Median ms | p95 ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Rules | 0.6471 | 1.0000 | 0.2941 | 0.4545 | 0.7274 | 0.7145 | 0.0167 | 0.0242 |
| Ml | 0.6176 | 0.6250 | 0.5882 | 0.6061 | 0.5742 | 0.5398 | 0.2723 | 0.3736 |
| Hybrid | 0.6471 | 1.0000 | 0.2941 | 0.4545 | 0.7475 | 0.7301 | 0.2891 | 0.4196 |

## Confusion Matrices

### Rules

| Actual / Predicted | Safe | Phishing |
|---|---:|---:|
| Safe | 17 | 0 |
| Phishing | 12 | 5 |

### Ml

| Actual / Predicted | Safe | Phishing |
|---|---:|---:|
| Safe | 11 | 6 |
| Phishing | 7 | 10 |

### Hybrid

| Actual / Predicted | Safe | Phishing |
|---|---:|---:|
| Safe | 17 | 0 |
| Phishing | 12 | 5 |

## Limitations

- Only 34 curated pilot messages are evaluated.
- Examples are synthetic or manually curated and are not representative of production traffic.
- Per-language sample counts are too small for reliable language-specific performance claims.
- The artifact is a competition baseline and must not be the sole security control.

## Conclusion

The live classifier is an explainable **rules + TF-IDF pilot hybrid**. These results demonstrate reproducibility, not production readiness.
