# ==============================================================================
# MAMS API Backend - Optimized Multi-Stage Dockerfile
# Base: Node 20 on Alpine Linux (~65MB runtime footprint)
# Build context: repository root (.)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS node-build

WORKDIR /app/mams

# 1. Copy package manifests first for optimal layer caching
COPY mams/package.json mams/package-lock.json ./
COPY mams/tsconfig.base.json ./
COPY mams/shared/types/package.json shared/types/
COPY mams/mams-server/package.json mams-server/
COPY mams/mams-web/package.json mams-web/

# 2. Install all dependencies (including devDependencies needed for TypeScript)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev

# 3. Copy TypeScript source files & Docker tsconfig definitions
COPY mams/shared/types shared/types
COPY mams/mams-server mams-server
COPY mams/shared/types/tsconfig.docker.json shared/types/tsconfig.docker.json
COPY mams/mams-server/tsconfig.docker.json mams-server/tsconfig.docker.json

# 4. Compile TypeScript for @mams/types and mams-server
RUN npm run build:docker --workspace @mams/types && \
    npm run build:docker --workspace mams-server

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runtime

# Install essential runtime tools (bash for entrypoint, curl for healthcheck, tzdata for IST timezone)
RUN apk add --no-cache bash curl ca-certificates tzdata

WORKDIR /app/mams

# Copy package manifests for production-only dependencies
COPY mams/package.json mams/package-lock.json ./
COPY mams/shared/types/package.json shared/types/
COPY mams/mams-server/package.json mams-server/

# Install only production dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --workspace @mams/types --workspace mams-server

# Copy compiled JavaScript bundles from builder stage
COPY --from=node-build /app/mams/shared/types/dist shared/types/dist
COPY --from=node-build /app/mams/mams-server/dist mams-server/dist

# Production environment defaults
ENV NODE_ENV=production \
    PORT=3001 \
    TZ=Asia/Kolkata \
    VOSK_ENABLED=false \
    BUG_REPORT_MEDIA_DIR=/var/data/bug-reports \
    BUG_REPORT_TRANSCRIPTION_TEMP_DIR=/tmp/mams-transcription

# Copy entrypoint script and ensure correct permissions & directories
COPY mams/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /var/data/bug-reports /tmp/mams-transcription \
    && chown -R node:node /app/mams /var/data/bug-reports /tmp/mams-transcription

EXPOSE 3001

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3001/api/health || exit 1

# Run as non-root user for security
USER node

ENTRYPOINT ["/bin/bash", "/usr/local/bin/docker-entrypoint.sh"]
