# MCIPS Go Agent

The Go agent is a Linux-oriented sidecar for the SecureLens hybrid architecture.

## What it does

- polls an inbound SMS NDJSON file
- polls an auth log NDJSON file
- normalizes both into backend-ready events
- forwards them to `POST /api/events`
- exposes `GET /agent/health` and `GET /agent/status`
- executes approved actions by writing response artifacts and a local blocklist file

## Expected input files

- watched inbox: `runtime/sms-inbox.ndjson`
- watched auth log: `runtime/auth-log.ndjson`
- sample demo payloads: `examples/sms-inbox.ndjson` and `examples/auth-log.ndjson`

Each line must be valid JSON.

## Runtime outputs

- action artifacts under `runtime/artifacts/`
- blocklist entries in `runtime/blocklist.txt`

## Start

1. Create environment variables from `.env.example`
2. Start the backend and AI service
3. Start the agent
4. Append new NDJSON lines from `examples/` into the watched `runtime/` files to generate real events
