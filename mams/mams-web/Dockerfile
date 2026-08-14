# ==============================================================================
# MAMS Web Frontend (SPA) - Optimized Multi-Stage Dockerfile
# Stage 1: Node 20 Alpine Vite Builder
# Stage 2: Nginx 1.27 Alpine Runtime (~35MB total image)
# Build context: mams/ directory
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Vite React SPA
# ------------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app/mams

# 1. Copy package manifests for optimal layer caching
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY shared/types/package.json shared/types/
COPY mams-server/package.json mams-server/
COPY mams-web/package.json mams-web/

# 2. Clean install dependencies using BuildKit cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev

# 3. Copy shared types and web source code
COPY shared/types shared/types
COPY mams-web mams-web

# Same-origin API for on-prem / compose — do not bake a cloud host into the bundle.
ENV VITE_API_BASE_URL= \
    VITE_DEVICE_API_BASE_URL=

# 4. Build shared types followed by React Vite bundle
RUN npm run build --workspace @mams/types && \
    npm run build --workspace @mams/web

# ------------------------------------------------------------------------------
# Stage 2: Nginx Production Web Server
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Remove default static demo files
RUN rm -rf /usr/share/nginx/html/*

# Copy high-performance & secured Nginx configuration
COPY mams-web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy production SPA build output
COPY --from=build /app/mams/mams-web/dist /usr/share/nginx/html

EXPOSE 80

# Web server healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
