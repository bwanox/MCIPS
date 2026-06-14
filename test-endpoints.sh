#!/bin/bash

# MCIPS API Testing Script
# This script tests the core backend API endpoints.
# It assumes the backend is running at http://localhost:4000.

BASE_URL="http://localhost:4000/api"
EMAIL="admin@mcips.local"
PASSWORD="password"

echo "------------------------------------------------"
echo "🔍 MCIPS API Connectivity & Audit Test"
echo "------------------------------------------------"

# 1. Test Health & Event Types (Public)
echo "Testing Public Endpoints..."
curl -s "$BASE_URL/events/types" | grep -q "sms.message.received" && echo "✅ GET /events/types: OK" || echo "❌ GET /events/types: FAILED"

# 2. Login
echo -e "\nLogging in as $EMAIL..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Ensure backend is running and credentials are correct."
  exit 1
fi
echo "✅ Login successful. Token obtained."

AUTH_HEADER="Authorization: Bearer $TOKEN"

# 3. Test Authenticated Endpoints
echo -e "\nTesting Authenticated Endpoints..."

test_get() {
  local endpoint=$1
  local name=$2
  curl -s -o /dev/null -w "%{http_code}" -H "$AUTH_HEADER" "$BASE_URL$endpoint" | grep -q "200" && echo "✅ GET $endpoint ($name): OK" || echo "❌ GET $endpoint ($name): FAILED"
}

test_get "/auth/me" "User Info"
test_get "/alerts/recent" "Recent Alerts"
test_get "/incidents" "Incidents List"
test_get "/stats/summary" "Stats Summary"
test_get "/copilot/feed" "Copilot Feed"
test_get "/simulation/status" "Simulation Status"

# 4. Test Event Ingestion (as User)
echo -e "\nTesting Manual Event Ingestion..."
INGEST_RESPONSE=$(curl -s -X POST "$BASE_URL/events" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"eventType": "sms.message.received", "payload": {"content": "Test manual event ingestion"}}')

if echo $INGEST_RESPONSE | grep -q '"id":'; then
  echo "✅ POST /events (Manual Ingestion): OK"
else
  echo "❌ POST /events (Manual Ingestion): FAILED"
  echo "Response: $INGEST_RESPONSE"
fi

echo -e "\n------------------------------------------------"
echo "🎉 API Audit & Testing Complete"
echo "Check API_AUDIT_REPORT.md for full endpoint details."
echo "------------------------------------------------"
