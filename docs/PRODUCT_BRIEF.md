# MCIPS SecureLens Product Brief

MCIPS SecureLens is a privacy-first security operations prototype for small and midsize organizations. It collects SMS, authentication, email, network, and log signals; normalizes and sanitizes them; classifies threats with a rules + TF-IDF pilot hybrid; correlates related events into incidents; and keeps humans in control of response actions.

## What Is Real

- SMS/auth file collection through the Go agent
- Backend normalization, validation, sanitization, risk scoring, correlation, incident workflow, receipts, audit history, and Mongo persistence
- Tenant-bound collector keys using HMAC-hashed credentials
- Authenticated REST APIs and tenant-scoped Socket.IO rooms
- Reproducible pilot AI evaluation from the 34-message corpus

## What Is Simulated

- Password reset
- Firewall/domain blocking
- Local blocklist artifacts

Those actions write receipts and artifacts, but they are not connected to external identity or firewall providers yet.

## Competition Positioning

SecureLens is not claiming production-grade detection accuracy. Its strength is an honest, end-to-end cyber workflow: privacy-safe evidence, explainable hybrid detection, cross-signal incident correlation, human approval, and truthful simulated response receipts.
