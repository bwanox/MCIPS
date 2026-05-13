# MCIPS

MCIPS is a realtime security monitoring demo platform with three parts:

- `ai-service`: the existing Python inference microservice that classifies sanitized security events.
- `backend`: a TypeScript orchestration layer that ingests events, sanitizes private content, calls the AI service, persists sanitized metadata, emits Socket.IO updates, and exposes auth/stats/simulation APIs.
- `frontend`: a Next.js App Router SOC dashboard with JWT login, live alerts, charts, simulator controls, and manual event submission.

## Architecture Flow

1. Client or simulator posts an event to `POST /api/events`.
2. Backend validates the payload with Zod.
3. `privacySanitizer` masks PII before any AI call.
4. Backend calls `POST {AI_SERVICE_URL}/inference/analyze`.
5. If AI times out or fails, backend generates a fallback `suspicious / MEDIUM` result.
6. `alertEngine` converts the inference output into the dashboard alert contract.
7. Backend stores sanitized `Alert` and `EventLog` records in MongoDB or in-memory repositories.
8. Backend emits `alert:new`, `stats:update`, `simulation:status`, and `system:status` over Socket.IO.
9. Frontend renders only sanitized previews and metadata.

## Privacy Policy

- Raw content is sanitized before AI analysis.
- Dashboard APIs return `sanitizedPreview`, not raw content.
- Default storage mode is sanitized-only.
- `STORE_RAW_CONTENT` is off by default and raw content is still not exposed to the UI even if enabled later.
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
    "type":"EMAIL",
    "source":"manual",
    "content":"Attijariwafa Bank alert for john@example.com. OTP 123456 at https://bank.example"
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
6. Watch the live feed, charts, stats cards, and recent alerts update without page refresh.

## Tests

Backend tests live in [backend/src/tests/app.test.ts](/Users/bilalsahili/NetworkProject/MCIPS/backend/src/tests/app.test.ts:1) and [backend/src/tests/privacy-sanitizer.test.ts](/Users/bilalsahili/NetworkProject/MCIPS/backend/src/tests/privacy-sanitizer.test.ts:1).

Run them with:

```bash
cd backend
npm test
```
