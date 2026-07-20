# Railway / monorepo root build context (repo root = MaksonPharmaHRMS).
# Build context is the Git repository root. All sources live under mams/.
FROM node:20-bookworm AS node-build

WORKDIR /app/mams

COPY mams/package.json mams/package-lock.json ./
COPY mams/tsconfig.base.json ./
COPY mams/shared/types/package.json shared/types/
COPY mams/mams-server/package.json mams-server/
COPY mams/mams-web/package.json mams-web/

RUN npm install --include=dev

COPY mams/shared/types shared/types
COPY mams/mams-server mams-server
COPY mams/tsconfig.base.json ./tsconfig.base.json

RUN npm run build --workspace @mams/types && npm run build --workspace mams-server

FROM node-build AS vosk-models
WORKDIR /app/mams
RUN apt-get update && apt-get install -y --no-install-recommends unzip ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && node mams-server/scripts/download-vosk-models.mjs

FROM node:20-bookworm AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv ffmpeg ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/mams

COPY mams/package.json mams/package-lock.json ./
COPY mams/shared/types/package.json shared/types/
COPY mams/mams-server/package.json mams-server/

RUN npm install --omit=dev --workspace @mams/types --workspace mams-server

COPY --from=node-build /app/mams/shared/types/dist shared/types/dist
COPY --from=node-build /app/mams/mams-server/dist mams-server/dist
COPY --from=vosk-models /app/mams/mams-server/vosk-models mams-server/vosk-models
COPY mams/mams-server/vosk-service mams-server/vosk-service

RUN python3 -m venv /opt/vosk-venv \
  && /opt/vosk-venv/bin/pip install --no-cache-dir -r mams-server/vosk-service/requirements.txt

ENV NODE_ENV=production
ENV VOSK_MODELS_DIR=/app/mams/mams-server/vosk-models
ENV BUG_REPORT_MEDIA_DIR=/var/data/bug-reports
ENV BUG_REPORT_TRANSCRIPTION_TEMP_DIR=/tmp/mams-transcription

COPY mams/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["docker-entrypoint.sh"]
