# MCIPS

MCIPS is a realtime security monitoring demo platform with three parts:

- `ai-service`: the existing Python inference microservice that classifies sanitized security events.
- `backend`: a TypeScript orchestration layer that ingests events, sanitizes private content, calls the AI service, persists sanitized metadata, emits Socket.IO updates, and exposes auth/stats/simulation APIs.
- `frontend`: a Next.js App Router SOC dashboard with JWT login, live alerts, charts, simulator controls, and manual event submission.

## Unified Event Architecture

MCIPS now supports both legacy text events and a unified cyber event envelope:

```json
{
  "event_id": "uuid-001",
  "event_type": "net.intrusion.suspected",
  "tenant_id": "tenant-acme-corp",
  "event_timestamp_utc": "2025-01-15T14:23:44.998Z",
  "source": "dataset",
  "payload": {}
}
```

Legacy events such as:

```json
{
  "type": "SMS",
  "content": "Votre compte est bloque",
  "source": "manual"
}
```

remain supported and are normalized internally before processing.

## Architecture Flow

1. Client, dataset uploader, external source, or simulator posts an event to `POST /api/events` or `POST /api/events/batch`.
2. Backend normalizes legacy or unified payloads into a `CyberEventEnvelope`.
3. Backend validates the normalized envelope with discriminated Zod schemas by `eventType`.
4. `privacySanitizer` performs event-type-specific sanitization and derives safe features.
5. Structured dataset events are scored locally with `datasetScoring.service.ts`.
6. Natural language events are sanitized and then sent to `POST {AI_SERVICE_URL}/inference/analyze`.
7. If AI times out or fails, backend generates a fallback `suspicious / MEDIUM` result.
8. `alertEngine` converts the result into a standardized alert contract used across all event families.
9. Backend stores sanitized `Alert` and `EventLog` records in MongoDB or in-memory repositories.
10. Backend emits `alert:new`, `stats:update`, `simulation:status`, and `system:status` over Socket.IO.
11. Frontend renders only sanitized previews, derived fields, and standardized alert metadata in the SOC dashboard.

## Supported Event Families

- SMS Threat Events
- Authentication/Login Events
- Network Intrusion Events
- Log Anomaly Events
- Phishing Email Feature Events
- Generic Email Message Events
- Generic Text Message Events

## Privacy Policy

- Raw data is sanitized before AI analysis or persistence.
- Dashboard APIs render `sanitizedPreview`, not raw private content.
- Default storage mode is sanitized-only.
- Phishing email feature events hash raw email text immediately and store `email_text_hash` plus safe derived features instead of raw message text.
- Structured dataset events keep safe numerical/categorical features only.
- Natural language events mask email, phone, OTP, account, CIN-like IDs, URLs, bank names, and related PII before AI/storage.
- The sanitizer masks email, phone, OTP/PIN patterns, long numeric identifiers, account-like numbers, CIN-like IDs, URLs, obvious honorific-name cases, and supported Moroccan bank names.

## Backend Setup

1. Create `backend/.env` from [backend/.env.example](/Users/bilalsahili/NetworkProject/MCIPS/backend/.env.example:1).
2. Install dependencies with `npm install` inside `backend/`.
3. Start the API with `npm run dev`.

Backend environment variables:

- `PORT`
- `CLIENT_URL`
- `AI_SERVICE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `MONGODB_URI`
- `USE_IN_MEMORY_DB`
- `STORE_RAW_CONTENT`

Notes:

- If `USE_IN_MEMORY_DB=true`, the backend skips Mongo entirely.
- If Mongo connection fails, the app falls back to in-memory repositories automatically.
- Event ingestion is public for demo/testing; alerts, stats, and simulation routes require a bearer token.

## Frontend Setup

1. Create `frontend/.env.local` from [frontend/.env.example](/Users/bilalsahili/NetworkProject/MCIPS/frontend/.env.example:1).
2. Install dependencies with `npm install` inside `frontend/`.
3. Start the app with `npm run dev`.
4. Open `http://localhost:3000/login`.

Frontend environment variables:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`

## AI Service Setup

The backend expects the Python service at `AI_SERVICE_URL` to expose:

- `POST /inference/analyze`

Expected request body:

```json
{
  "type": "EMAIL",
  "content": "sanitized content",
  "source": "manual",
  "ip_address": "1.2.3.4",
  "country": "MA",
  "device": "Chrome on macOS",
  "user_agent": "Mozilla/5.0"
}
```

Expected response body:

```json
{
  "label": "phishing",
  "confidence": 0.93,
  "risk": "HIGH",
  "explanation": "Contains credential theft indicators",
  "features": ["credential_request", "urgent_language"],
  "model_used": "hybrid_ai_v1",
  "fallback_used": false
}
```

## API

Public:

- `GET /health`
- `POST /api/events`
- `POST /api/events/batch`
- `GET /api/events/types`

Authenticated:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/alerts`
- `GET /api/alerts/recent`
- `GET /api/alerts/:id`
- `GET /api/stats/summary`
- `GET /api/stats/timeline?range=today|week|month`
- `POST /api/simulation/start`
- `POST /api/simulation/stop`
- `GET /api/simulation/status`
- `POST /api/simulation/once`

## WebSocket Events

- `alert:new`
- `stats:update`
- `simulation:status`
- `system:status`

## Curl Examples

Health:

```bash
curl http://localhost:4000/health
```

Login:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mcips.local","password":"admin123"}'
```

Manual event submission:

```bash
curl -X POST http://localhost:4000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_type":"sms.message.received",
    "source":"manual",
    "payload":{
      "content":"Attijariwafa Bank alert for john@example.com. OTP 123456 at https://bank.example"
    }
  }'
```

Network intrusion submission:

```bash
curl -X POST http://localhost:4000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_type":"net.intrusion.suspected",
    "source":"dataset",
    "payload":{
      "protocol_type":"tcp",
      "service":"http",
      "flag":"SF",
      "class":"neptune",
      "difficulty_level":15,
      "num_failed_logins":5,
      "root_shell":1,
      "num_compromised":1,
      "serror_rate":0.8
    }
  }'
```

Authenticated summary:

```bash
curl http://localhost:4000/api/stats/summary \
  -H "Authorization: Bearer <token>"
```

## Demo Walkthrough

1. Start the AI service.
2. Start the backend in memory mode.
3. Start the frontend.
4. Log in with `ADMIN_EMAIL` and the password matching `ADMIN_PASSWORD_HASH`.
5. Use `Run Once` in the simulator or submit a manual event.
6. Watch the live feed, family/type charts, stats cards, filters, and recent alerts update without page refresh.

## Tests

Backend tests live in [backend/src/tests/app.test.ts](/Users/bilalsahili/NetworkProject/MCIPS/backend/src/tests/app.test.ts:1) and [backend/src/tests/privacy-sanitizer.test.ts](/Users/bilalsahili/NetworkProject/MCIPS/backend/src/tests/privacy-sanitizer.test.ts:1).

Run them with:

```bash
cd backend
npm test
```
