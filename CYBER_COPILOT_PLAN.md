# MCIPS SecureLens Cyber Copilot

## Vision

MCIPS SecureLens should become an always-on, interactive **cyber copilot** running on the server where it is deployed.

It should feel like a **virtual cybersecurity department** for SMEs and institutions by:

- detecting threats in real time
- monitoring trusted communication and system signals
- correlating signals into incidents
- explaining why an incident matters
- recommending what to do next
- taking controlled response actions
- notifying the right people when action is required

## Core Experience

The copilot should let users:

- understand what happened
- review a clear incident timeline
- see related email, messaging, call, login, and network signals
- get triage priority and response guidance
- ask follow-up questions on sanitized evidence

Example interactions:

- "Why was this flagged?"
- "What should we do first?"
- "Show related events."
- "Summarize this for management."

## Key Additions

- **Incident investigation view**: summary, timeline, correlated signals, severity, and sanitized evidence.
- **Live source connectors**: ingest email, messaging, login, network, and suspicious screen or system message events.
- **Explainability panel**: risk factors, correlation reasons, confidence, and privacy notes.
- **Recommended actions**: immediate triage and remediation guidance per incident.
- **Interactive copilot**: a query panel over sanitized incident context.
- **Copilot feed**: plain-language incident updates and escalations.
- **Email notification layer**: send mail when incidents are critical, approval is needed, or action is required.

## Monitoring Scope

The copilot should continuously monitor selected trusted sources such as:

- email
- internal messaging or SMS
- authentication and login activity
- network and server telemetry
- suspicious on-screen or system warning messages
- optional call metadata or sanitized transcripts

All incoming signals should be normalized into the same event model, sanitized, analyzed, and correlated.

## Action Layer

The copilot should support **controlled actions**, not arbitrary system control.

Possible actions:

- notify admin or affected user by email
- update incident status
- create response ticket
- block a suspicious sender, domain, or IP
- revoke sessions
- force password reset
- disable an account temporarily
- trigger a predefined response playbook

Action policy:

- low-risk actions can run automatically
- sensitive actions require approval
- every action must be logged in an audit trail

## Technical Needs

### Hybrid Architecture

SecureLens should use a **hybrid architecture** instead of a full backend rewrite.

Recommended split:

- **TypeScript backend**: APIs, auth, incident correlation, dashboard updates, notifications, approval workflows, and copilot coordination.
- **Low-level agent in Go or Rust**: host monitoring, OS-level collectors, and controlled response playbooks.
- **Python AI service**: threat detection, incident summarization, recommended actions, and copilot reasoning on sanitized data.

Why this split works:

- TypeScript keeps fast product development and smooth server-side control.
- Go or Rust handles tighter OS interaction and lightweight always-on execution.
- Python remains focused on AI and ML tasks.

### Action Flow

The system should follow a controlled execution model:

1. the low-level agent captures system or communication signals
2. the TypeScript backend normalizes, sanitizes, and correlates them
3. the AI service explains the incident and recommends actions
4. the backend checks policy and approval rules
5. the agent executes only approved predefined actions
6. every action is logged in an audit trail

### Backend

- add incident APIs such as `GET /api/incidents`, `GET /api/incidents/:id`, and `GET /api/copilot/feed`
- add source connectors or ingestion adapters for email, messaging, auth logs, and system alerts
- persist incident state, correlated signals, summaries, and recommended actions
- add an action runner for approved playbooks
- add an email notification service for critical and action-required incidents
- normalize all live source inputs into a shared event envelope
- optimize correlation to query recent tenant signals instead of scanning all alerts
- keep fast ingest separate from slower copilot summarization and notification work

### AI Service

- generate incident summaries from sanitized correlated events
- generate recommended actions and triage priority
- answer user questions from sanitized incident context
- classify suspicious communication patterns across messages, emails, screen content, or call transcripts
- classify whether approval is required for an action
- keep deterministic fallback behavior when AI is unavailable

### Frontend

- add incident details page
- add timeline, explainability, and actions panels
- add copilot feed and risk overview
- show source type clearly across email, message, call, login, and system-origin incidents
- add interactive copilot chat or query panel
- add action approval UI and email/notification status UI

## Competition Value

This makes SecureLens more than a detector. It becomes a practical AI security assistant that:

- protects privacy
- explains its reasoning
- connects communication and infrastructure signals into one incident story
- combines high-level orchestration with low-level system control
- guides response actions
- stays active on the server and alerts users when needed
- supports organizations without a real SOC team

## Priority For The Next Month

1. incident investigation page
2. live source connectors for email, messaging, and login events
3. explainability panel
4. recommended actions and email notification layer
5. interactive copilot over sanitized incident data
6. controlled action and approval workflow

## Positioning

**MCIPS SecureLens is an always-on, privacy-preserving cyber copilot that acts like a virtual cybersecurity department by monitoring communication and system signals, correlating threats, and guiding response actions for small organizations.**
