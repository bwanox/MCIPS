# Three-Minute Demo Script

## 0:00-0:30 - Login And Posture

Log in as the configured admin. Show dashboard health, recent alerts, and the tenant-scoped live workspace.

## 0:30-1:15 - Agent Ingestion

Append a phishing SMS to the agent inbox. Explain that the agent forwards with `X-Collector-Key`; the backend ignores client-supplied tenant fields and derives tenant/adapter/hash.

## 1:15-1:50 - Correlation

Append a suspicious login event. Show that the SMS and login become one incident with increased risk, one canonical incident ID, timeline citations, evidence citations, and candidate ATT&CK mappings.

## 1:50-2:30 - Human Approval

Open the incident. Review recommended actions, approve the password reset action, and show the action moving through `dispatching` to `simulated`.

## 2:30-3:00 - Evidence And Honesty

Show the receipt artifact, privacy-safe evidence, copilot citations, and real-versus-simulated table. Close by stating that the model evaluation is a 34-sample pilot benchmark, not production validation.
