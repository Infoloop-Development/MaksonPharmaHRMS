# MAMS API + offline Vosk transcription (Node + Python + ffmpeg)
FROM node:20-bookworm AS node-build

WORKDIR /app/mams

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY shared/types/package.json shared/types/
COPY mams-server/package.json mams-server/
COPY mams-web/package.json mams-web/

RUN npm install --include=dev

COPY shared/types shared/types
COPY mams-server mams-server
COPY shared/types/tsconfig.docker.json shared/types/tsconfig.docker.json
COPY mams-server/tsconfig.docker.json mams-server/tsconfig.docker.json

RUN npm run build:docker --workspace @mams/types && npm run build:docker --workspace mams-server

# Download Vosk models at build time (~165MB total)
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

COPY package.json package-lock.json ./
COPY shared/types/package.json shared/types/
COPY mams-server/package.json mams-server/

RUN npm install --omit=dev --workspace @mams/types --workspace mams-server

COPY --from=node-build /app/mams/shared/types/dist shared/types/dist
COPY --from=node-build /app/mams/mams-server/dist mams-server/dist
COPY --from=vosk-models /app/mams/mams-server/vosk-models mams-server/vosk-models
COPY mams-server/vosk-service mams-server/vosk-service

RUN python3 -m venv /opt/vosk-venv \
  && /opt/vosk-venv/bin/pip install --no-cache-dir -r mams-server/vosk-service/requirements.txt

ENV NODE_ENV=production
ENV VOSK_MODELS_DIR=/app/mams/mams-server/vosk-models
ENV BUG_REPORT_MEDIA_DIR=/var/data/bug-reports
ENV BUG_REPORT_TRANSCRIPTION_TEMP_DIR=/tmp/mams-transcription

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Strip Windows CRLF if present — otherwise shebang becomes `bash\r` and the container exits with empty deploy logs.
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/bin/bash", "/usr/local/bin/docker-entrypoint.sh"]
