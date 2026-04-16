#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"

echo "Checking health..."
curl -fsS "$BASE_URL/health" | jq .

echo "Listing event types..."
curl -fsS "$BASE_URL/api/event-types" | jq .

echo "Fetching availability..."
curl -fsS "$BASE_URL/api/availability" | jq .

echo "Fetching slots for 30min on the next provided date..."
DATE="${DATE:-2026-04-20}"
curl -fsS "$BASE_URL/api/slots?eventTypeId=2&date=$DATE" | jq .

echo "Verification requests completed."
