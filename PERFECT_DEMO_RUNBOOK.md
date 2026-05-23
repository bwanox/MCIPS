# MCIPS SecureLens Perfect Demo Runbook

## Goal

Run one polished story every time:

1. phishing SMS arrives
2. sanitizer masks OTP, bank name, and URL
3. suspicious login follows
4. one critical incident is created
5. copilot explains why it escalated
6. one approval-ready action appears
7. notification status and export are visible

## Service Start Order

1. Start `ai-service`
2. Start `backend`
3. Start `frontend`
4. Start `agent` for the real collector + safe executor demo path

## Exact Click Path

1. Start the Go agent so it watches:
   - `agent/runtime/sms-inbox.ndjson`
   - `agent/runtime/auth-log.ndjson`
2. Append the sample SMS line from `agent/examples/sms-inbox.ndjson` into `agent/runtime/sms-inbox.ndjson`
3. Append the sample auth line from `agent/examples/auth-log.ndjson` into `agent/runtime/auth-log.ndjson`
4. Log in to the dashboard
5. Switch to `Incidents`
6. Show the spotlight incident card
7. Show the timeline with:
   - phishing SMS source
   - suspicious login source
8. Show the explainable factors and approval-ready action
9. Ask the copilot: `What should we do first?`
10. Approve the password reset action
11. Show the agent artifact path and blocklist output in system status
12. Export the sanitized incident JSON

## Expected Results

- one phishing SMS alert
- one suspicious login alert
- one correlated critical incident
- one approval-required action
- one critical incident notification
- one approval-required notification
- one action artifact JSON written under `agent/runtime/artifacts/`
- one blocklist entry appended to `agent/runtime/blocklist.txt`
- no raw OTP, bank account, or malicious URL in visible output

## Acceptance Checklist

- appending the SMS sample produces one `sms.message.received` event
- appending the auth sample produces one `auth.login.attempt` event
- spotlight incident becomes visible without manual refresh issues
- workspace timeline shows both SMS and login entries
- one password reset approval action is visible
- copilot answer mentions the recommended first action
- agent status shows both collectors healthy
- approving the action writes the artifact and blocklist outputs
- export JSON matches the visible incident story
- rerunning with fresh appended lines creates the same story without duplicate notifications for the same event

## Recovery

- If the UI looks stale, refresh the dashboard after appending the watched-file inputs
- If notifications look duplicated, clear the in-memory backend state or restart the backend in demo mode
- If AI is unavailable, restart `ai-service` and rerun the scenario
- If the watched files already contain old data, truncate:
  - `agent/runtime/sms-inbox.ndjson`
  - `agent/runtime/auth-log.ndjson`
  - `agent/runtime/blocklist.txt`
