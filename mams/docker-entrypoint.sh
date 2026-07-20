#!/usr/bin/env bash
set -euo pipefail

cd /app/mams/mams-server/vosk-service

export VOSK_MODELS_DIR="${VOSK_MODELS_DIR:-/app/mams/mams-server/vosk-models}"
export VOSK_HOST="${VOSK_HOST:-127.0.0.1}"
export VOSK_PORT="${VOSK_PORT:-8765}"

/opt/vosk-venv/bin/uvicorn app:app --host "$VOSK_HOST" --port "$VOSK_PORT" &
VOSK_PID=$!

cleanup() {
  kill "$VOSK_PID" 2>/dev/null || true
}
trap cleanup EXIT

wait_for_vosk() {
  echo "Waiting for Vosk service on http://${VOSK_HOST}:${VOSK_PORT}/health ..."
  for i in $(seq 1 120); do
    if curl -sf "http://${VOSK_HOST}:${VOSK_PORT}/health" >/dev/null; then
      echo "Vosk service ready."
      return 0
    fi
    if ! kill -0 "$VOSK_PID" 2>/dev/null; then
      echo "Vosk service exited unexpectedly." >&2
      return 1
    fi
    sleep 2
  done
  echo "Timed out waiting for Vosk service." >&2
  return 1
}

# On Railway/cloud, loading 3 Vosk models can exceed startup healthcheck budgets.
# Start the API immediately; bug-report transcription waits until Vosk is ready.
if [ "${VOSK_BLOCK_STARTUP:-false}" = "true" ]; then
  wait_for_vosk
else
  (
    if wait_for_vosk; then
      echo "Vosk background startup complete."
    else
      echo "Vosk background startup failed — transcription will be unavailable." >&2
    fi
  ) &
fi

mkdir -p "${BUG_REPORT_MEDIA_DIR:-/var/data/bug-reports}" "${BUG_REPORT_TRANSCRIPTION_TEMP_DIR:-/tmp/mams-transcription}"

cd /app/mams/mams-server
exec node dist/index.js
