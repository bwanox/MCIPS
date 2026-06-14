# STRIDE Threat Model

| Category | Key Risk | Current Control | Remaining Gap |
|---|---|---|---|
| Spoofing | Collector impersonation | HMAC-hashed collector keys, `X-Collector-Key`, scopes, tenant binding | Key rotation UI is not implemented |
| Spoofing | Socket tenant snooping | Socket JWT auth and tenant rooms | Full user administration/OIDC is out of scope |
| Tampering | Client-supplied tenant/source metadata | Backend derives tenant, adapter, source family, and hash | More collector adapters need signed provenance |
| Repudiation | Response action ambiguity | Audit trail and execution receipts with provider/outcome/idempotency | External connector receipts are not available yet |
| Information Disclosure | Sensitive message content | Sanitizer masks PII/secrets and stores hashes/metadata | Regex masking is not a formal DLP guarantee |
| Denial Of Service | Large requests or batches | 256 KB body limit, 10,000 char content limit, batch max 50 | No distributed rate-limit store yet |
| Elevation Of Privilege | Default production secrets | Production startup rejects missing/short/default secrets and memory DB | Single-admin model only, no MFA |

## Assumptions

- The demo tenant is a single administrative tenant.
- The Go agent runs in a trusted customer environment.
- Password reset and blocking actions are simulated until connected to real providers.
