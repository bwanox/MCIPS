# MCIPS SecureLens Live Demo Validation

Date: 2026-05-14

## Summary

The current local competition build is viable for the primary walkthrough.

Validated successfully:

- backend health
- AI service health
- default local login credentials
- phishing SMS -> suspicious login -> correlated incident escalation
- network intrusion local scoring
- live `alert:new` and `stats:update` socket events
- incident export JSON
- backend fallback behavior when the AI service is unavailable
- visible branding cleanup for browser metadata and product copy

## Passed Checks

### Startup sanity

- `GET /health` returned backend `ok`
- AI service health returned `healthy`
- backend login returned a valid JWT for `admin@mcips.local / admin123`
- frontend default port issue was corrected by replacing a stale broken process on `3000` with a clean Next dev server

### Primary competition scenario

Executed against the live backend and socket server with tenant `tenant-demo-live`.

1. Injected a fake Moroccan bank SMS
2. Injected a suspicious login attempt
3. Confirmed correlation and escalation
4. Exported the incident artifact

Observed results:

- SMS classification: `phishing`
- SMS risk: `HIGH`
- SMS preview: `Votre compte CIH est bloque. Confirmez votre [OTP] sur [URL]`
- Suspicious login severity: `critical`
- Correlation detected: `true`
- Explainable score: `100`
- Recommended actions: 5 actions returned
- Export artifact project label: `MCIPS SecureLens`
- Export artifact contained no raw phishing text

### Secondary proof scenario

Injected a structured `net.intrusion.suspected` event.

Observed results:

- label: `network_intrusion`
- risk: `HIGH`
- severity: `critical`
- model used: `dataset_scoring_v1`

### Live update behavior

Verified through a live socket probe:

- socket connection established
- `alert:new` fired for phishing SMS
- `alert:new` fired for correlated login incident
- `alert:new` fired for reinforced network incident
- `stats:update` reflected total alert growth and correlated incident counts after each step

### Fallback resilience

Temporarily stopped the AI service and submitted a natural-language SMS event to the live backend.

Observed results:

- status: `201`
- label: `suspicious`
- risk: `MEDIUM`
- model used: `backend_fallback`
- `fallbackUsed: true`
- sanitized preview remained safe: `Votre compte CIH est bloque. [OTP] sur [URL]`

AI service was restarted successfully after the check.

## Issues Found

### Resolved during validation

- A stale broken frontend process was occupying port `3000` and forcing the working app onto `3001`.
- This was corrected by stopping the stale listener and starting a clean frontend dev server on the documented default port `3000`.

### Non-blocking observations

- The live runtime path currently uses `local_rules_v1` for the phishing SMS check instead of a richer external-AI explanation.
- This is not a blocker for the competition demo because the correlated incident flow, sanitization, scoring, and export behavior still work correctly.

## Branding Acceptance

Visible product naming now aligns with `MCIPS SecureLens` across:

- browser metadata
- login page copy
- dashboard hero and section copy
- README title and core framing
- incident export artifact label

No remaining repo-visible `MCIPS SOC Dashboard` string was found after the cleanup.

## Competition Readiness

Current status: ready for the core walkthrough.

Recommended live demo sequence:

1. Log in with the default local account
2. Trigger the fake Moroccan bank SMS
3. Trigger the suspicious login
4. Show the correlated incident, score factors, and recommended actions
5. Export the JSON artifact
6. Trigger the network intrusion example as the secondary proof point
