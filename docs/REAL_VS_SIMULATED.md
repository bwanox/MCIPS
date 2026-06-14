# Real Versus Simulated Features

| Capability | Status | Notes |
|---|---|---|
| SMS/auth collection | Real | Go agent watches local NDJSON files and forwards events |
| Sanitization | Real | Backend masks sensitive content before persistence and AI calls |
| Rules + TF-IDF classification | Real pilot | Reproducible 34-sample pilot benchmark |
| Correlation | Real | Tenant-window lookup and canonical incident ID reuse |
| Risk scoring | Real | Explainable factors and correlation bonus |
| Incident workflow | Real | Timeline, evidence, actions, notifications, audit history |
| Action receipts | Real | Provider/outcome/idempotency/artifact paths are persisted |
| Audit history | Real | Incident-level trail records ingestion, notifications, approvals, statuses |
| Password reset | Simulated | Writes local receipt only |
| Firewall/domain blocking | Simulated | Writes local blocklist artifact only |
| Local blocklist artifacts | Simulated control | Useful proof of intent, not an external enforcement point |
| OIDC/MFA/user administration | Out of scope | Single-admin tenant model only |
