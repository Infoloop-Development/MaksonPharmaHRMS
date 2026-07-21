#!/usr/bin/env bash
set -euo pipefail

export VOSK_MODELS_DIR="${VOSK_MODELS_DIR:-/app/mams/mams-server/vosk-models}"
export VOSK_HOST="${VOSK_HOST:-127.0.0.1}"
export VOSK_PORT="${VOSK_PORT:-8765}"

VOSK_PID=""

cleanup() {
  if [ -n "${VOSK_PID}" ]; then
    kill "$VOSK_PID" 2>/dev/null || true
  fi
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

start_vosk() {
  if [ ! -x /opt/vosk-venv/bin/uvicorn ]; then
    echo "Vosk runtime not present in this image — skipping." >&2
    return 0
  fi
  cd /app/mams/mams-server/vosk-service
  /opt/vosk-venv/bin/uvicorn app:app --host "$VOSK_HOST" --port "$VOSK_PORT" &
  VOSK_PID=$!

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
}

if [ "${VOSK_ENABLED:-false}" = "true" ]; then
  echo "VOSK_ENABLED=true — starting Vosk transcription sidecar."
  start_vosk
else
  echo "VOSK_ENABLED is not true — starting API only."
fi

mkdir -p "${BUG_REPORT_MEDIA_DIR:-/var/data/bug-reports}" "${BUG_REPORT_TRANSCRIPTION_TEMP_DIR:-/tmp/mams-transcription}"

echo "Starting mams-server (NODE_ENV=${NODE_ENV:-} PORT=${PORT:-3001}) ..."
cd /app/mams/mams-server
exec node dist/index.js
