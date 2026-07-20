# Railway slim API image (repo-root build context).
# Intentionally omits Vosk/ffmpeg Python sidecar — trial instances OOMed / never scheduled with the full image.
# For on-prem / full transcription, use mams/Dockerfile instead.

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
COPY mams/shared/types/tsconfig.docker.json shared/types/tsconfig.docker.json
COPY mams/mams-server/tsconfig.docker.json mams-server/tsconfig.docker.json

RUN npm run build:docker --workspace @mams/types && npm run build:docker --workspace mams-server

FROM node:20-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/mams

COPY mams/package.json mams/package-lock.json ./
COPY mams/shared/types/package.json shared/types/
COPY mams/mams-server/package.json mams-server/

RUN npm install --omit=dev --workspace @mams/types --workspace mams-server

COPY --from=node-build /app/mams/shared/types/dist shared/types/dist
COPY --from=node-build /app/mams/mams-server/dist mams-server/dist

ENV NODE_ENV=production
ENV VOSK_ENABLED=false
ENV BUG_REPORT_MEDIA_DIR=/var/data/bug-reports
ENV BUG_REPORT_TRANSCRIPTION_TEMP_DIR=/tmp/mams-transcription

COPY mams/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/bin/bash", "/usr/local/bin/docker-entrypoint.sh"]
