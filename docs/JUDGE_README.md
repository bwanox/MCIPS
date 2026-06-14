# Judge Documentation Index

- Product brief: `docs/PRODUCT_BRIEF.md`
- Architecture and trust boundaries: `docs/ARCHITECTURE_AND_TRUST_BOUNDARIES.md`
- STRIDE threat model: `docs/THREAT_MODEL_STRIDE.md`
- Corrected model card: `ai-service/reports/phishing_model_card.md`
- Corrected dataset card: `ai-service/reports/phishing_dataset_card.md`
- Generated pilot evaluation: `ai-service/reports/evaluation_report.md`
- Privacy leakage report: `docs/PRIVACY_LEAKAGE_REPORT.md`
- Three-minute demo script: `docs/DEMO_SCRIPT_3_MIN.md`
- Real-versus-simulated table: `docs/REAL_VS_SIMULATED.md`

## Setup Notes

Use `compose.env.example` as the placeholder reference and provide real secrets in an uncommitted `.env` file before running Docker Compose. Compose uses MongoDB by default and fails clearly when required secrets are absent.
