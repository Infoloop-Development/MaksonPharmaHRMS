# MAMS web (SPA) — multi-stage: Vite build + nginx runtime
# Build context: mams/ (monorepo root), same as the API image.
# VITE_* left empty so the browser uses same-origin /api (nginx proxies to the API).

FROM node:20-bookworm AS build

WORKDIR /app/mams

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY shared/types/package.json shared/types/
COPY mams-server/package.json mams-server/
COPY mams-web/package.json mams-web/

RUN npm install --include=dev

COPY shared/types shared/types
COPY mams-web mams-web

# Same-origin API for on-prem / compose — do not bake a cloud host into the bundle.
ENV VITE_API_BASE_URL=
ENV VITE_DEVICE_API_BASE_URL=

RUN npm run build --workspace @mams/types && npm run build --workspace @mams/web

FROM nginx:1.27-alpine AS runtime

COPY mams-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/mams/mams-web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
