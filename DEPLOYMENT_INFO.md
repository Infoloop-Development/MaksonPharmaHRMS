# MAMS — DevOps Deployment & Handoff Guide

**Product:** Makson Attendance Management System (MAMS / MaksonPharmaHRMS)  
**Scope:** Runtime versions, install/build/start, environment, database, hosting, health checks, and ops checklist  
**Primary code path:** `mams/` (npm workspaces monorepo)

---

## Table of contents

1. [Overview & architecture](#1-overview--architecture)
2. [Runtime versions](#2-runtime-versions)
3. [Installing Node & npm (if needed)](#3-installing-node--npm-if-needed)
4. [Local quick start](#4-local-quick-start)
5. [Build & start (production)](#5-build--start-production)
6. [Ports & health checks](#6-ports--health-checks)
7. [Environment variables](#7-environment-variables)
8. [Database](#8-database)
9. [Process managers & PaaS](#9-process-managers--paas)
10. [On-prem Docker (web + API)](#10-on-prem-docker-web--api)
11. [Third-party integrations](#11-third-party-integrations)
12. [CORS & reverse proxy](#12-cors--reverse-proxy)
13. [Production checklist](#13-production-checklist)
14. [Command cheat sheet](#14-command-cheat-sheet)

---

## 1. Overview & architecture

MAMS is a **MERN monorepo** under `mams/`:

| Package | Path | Role |
|---------|------|------|
| `@mams/types` | `mams/shared/types` | Shared Zod types (built first) |
| `@mams/server` | `mams/mams-server` | Express API (Node) |
| `@mams/web` | `mams/mams-web` | React SPA (Vite) |

**Typical production split:**

```
Browser → Netlify (static SPA: mams-web/dist)
              │
              └─ /api/* proxy → Render or Railway (mams-server)
                                      │
                                      └─ MongoDB Atlas
```

- **API host** needs **Node 20** only (plus optional Python/ffmpeg for Vosk transcription).
- **React is not installed on the API server** — it is bundled into static JS/CSS at SPA build time.
- Device punch endpoints (`/iclock`, Hanvon) hit the **API host** directly (not Netlify).

---

## 2. Runtime versions

| Component | Required / pin | Source |
|-----------|----------------|--------|
| **Node.js** | Pin **`20.18.0`**; engines allow `>=20.0.0` | `mams/.nvmrc`, `mams/package.json` `engines` |
| **npm** | `>=10.0.0` | `mams/package.json` `engines` |
| **Package manager** | **npm only** | Lockfile: `mams/package-lock.json` (no yarn.lock / pnpm-lock.yaml) |
| **React** | **`^18.3.1`** (18.3.x) | `mams/mams-web/package.json` |
| **react-dom** | **`^18.3.1`** | same |
| **Vite** | `^5.4.1` | SPA build toolchain |
| **TypeScript** | `^5.5.4` | both workspaces |
| **Express** | `^4.19.2` | API |
| **Mongoose** | `^8.5.3` | Mongo ODM |
| **Docker base images** | `node:20-bookworm` / `node:20-bookworm-slim` | root `Dockerfile`, `mams/Dockerfile` |

**Optional (full transcription image only):**

| Component | Purpose |
|-----------|---------|
| Python 3 + venv | Vosk FastAPI sidecar |
| ffmpeg / ffprobe | Audio extract for bug-report transcription |

**Recommendation:** Use Node **20.18.x** everywhere (local, CI, containers).

---

## 3. Installing Node & npm (if needed)

### Windows (nvm-windows or official installer)

1. Install [Node 20 LTS](https://nodejs.org/) **or** nvm-windows.
2. If using nvm from the monorepo:

```powershell
cd mams
nvm install 20.18.0
nvm use 20.18.0
```

3. Verify:

```powershell
node -v    # expect v20.18.0 (or any v20.x matching engines)
npm -v     # expect 10.x or higher
```

### macOS / Linux (nvm or fnm)

```bash
cd mams
nvm install   # reads .nvmrc → 20.18.0
nvm use
node -v && npm -v
```

Do **not** use Yarn or pnpm for this repo — install with **`npm ci`** against `package-lock.json`.

---

## 4. Local quick start

All commands below assume the monorepo root:

```bash
cd mams
```

### 4.1 Install dependencies

```bash
npm ci
```

(First-time / no lock sync: `npm install`.)

### 4.2 Configure env

1. Copy `mams/mams-server/.env.example` → `mams/mams-server/.env`
2. Set at least:
   - `JWT_ACCESS_SECRET` (min 16 chars)
   - `JWT_REFRESH_SECRET` (min 16 chars)
   - `MONGO_URI` (local Mongo or Atlas)
3. Web: `mams/mams-web/.env.development` typically leaves `VITE_API_BASE_URL` empty so Vite proxies `/api` → `:3001`.

### 4.3 Run (two terminals)

```bash
# Terminal 1 — API
npm run dev:server

# Terminal 2 — SPA
npm run dev:web
```

| Service | URL / port |
|---------|------------|
| Web (Vite) | http://localhost:5173 |
| API | http://localhost:3001 |
| Health | http://localhost:3001/api/health |

Optional offline STT:

```bash
npm run vosk:models
npm run dev:vosk
```

---

## 5. Build & start (production)

### 5.1 API (Node process)

From `mams/`:

```bash
npm ci
npm run build:server
npm run start:server
```

| Step | Script | What it does |
|------|--------|----------------|
| Build | `npm run build:server` | Builds `@mams/types` then `tsc` → `mams-server/dist` |
| Start | `npm run start:server` | `node dist/index.js` (workspace `@mams/server`) |

Equivalent workspace commands:

```bash
npm run build --workspace @mams/types
npm run build --workspace mams-server
npm run start --workspace mams-server
```

### 5.2 Web (static SPA)

From `mams/`:

```bash
npm ci
npm run build --workspace @mams/types
npm run build --workspace mams-web
```

**Output:** `mams/mams-web/dist` — serve with Netlify, nginx, CDN, etc.

Netlify build (see `mams/netlify.toml`):

```text
command = "npm install && npm run build --workspace @mams/types && npm run build --workspace mams-web"
publish = "mams-web/dist"
```

Set build-time env as needed:

- `VITE_API_BASE_URL` — absolute API origin **without** `/api` (or leave empty and proxy `/api/*`)
- `VITE_DEVICE_API_BASE_URL` — optional separate host for device-facing API

### 5.3 Docker

| Image | File | Use case |
|-------|------|----------|
| **Slim** | Repo-root [`Dockerfile`](Dockerfile) | Railway / small hosts; **no Vosk** (`VOSK_ENABLED=false`) |
| **Full** | [`mams/Dockerfile`](mams/Dockerfile) | Render / on-prem with transcription (Python + ffmpeg + models) |

Both:

- Build Node 20
- Expose **3001**
- Entrypoint: `mams/docker-entrypoint.sh` → `node dist/index.js`
- Expect a **volume** for bug-report media (`BUG_REPORT_MEDIA_DIR`, default `/var/data/bug-reports`)

---

## 6. Ports & health checks

| Service | Port | Config |
|---------|------|--------|
| mams-server | **3001** (default) | Env `PORT` |
| Vite (dev only) | **5173** | Vite default |
| Vosk sidecar (optional) | **8765** | `VOSK_HOST` / `VOSK_PORT` |

### Health endpoints (no auth)

| Path | Notes |
|------|--------|
| `GET /health` | `{ status: "ok", ts }` |
| `GET /api/health` | Same; used by Railway/Render healthchecks |
| `GET /` | API info JSON (SPA lives on `PUBLIC_APP_URL`) |

**Configure load balancer / PaaS healthcheck to:** `/api/health`

Optional admin route (auth + `read.system_health`): `GET /api/admin/health`

---

## 7. Environment variables

Canonical examples:

- `mams/mams-server/.env.example`
- `mams/mams-web/.env.example`
- Validated schema: `mams/mams-server/src/config/env.ts`
- Mail: `mams/mams-server/src/config/mail.ts`

### 7.1 API — required in production

| Variable | Required | Purpose |
|----------|----------|---------|
| `JWT_ACCESS_SECRET` | **Yes** (min 16) | Sign access tokens |
| `JWT_REFRESH_SECRET` | **Yes** (min 16) | Sign refresh tokens |
| `MONGO_URI` | **Yes** (prod) | Mongo connection string |

Generate secrets:

```bash
openssl rand -base64 32
```

### 7.2 API — core optional (with defaults)

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |
| `PORT` | `3001` | Listen port |
| `JWT_ACCESS_EXPIRES` | `15m` | Access TTL |
| `JWT_REFRESH_EXPIRES` | `7d` | Refresh TTL |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed browser origin(s), comma-separated |
| `PUBLIC_APP_URL` | `http://localhost:5173` | SPA URL (emails, visitor links, CORS helper) |
| `LOG_LEVEL` | `info` | Logging |
| `TZ` | `Asia/Kolkata` | Timezone |
| `SMART_ANCHOR_VERSION` | `v3.0.0` | Attendance engine label |
| `COMPLIANCE_AUTOGEN_ENABLED` | off unless `true`/`1` | Nightly compliance job |
| `COMPLIANCE_AUTOGEN_CRON_SECRET` | — | Optional cron HTTP secret |
| `REPORT_JOBS_ENABLED` | on (unless `false`/`0`) | Background report runner |
| `BUG_REPORT_MEDIA_DIR` | `./data/bug-reports` | Disk for bug videos/files (**persist volume**) |
| `REPORT_MEDIA_DIR` | `./data/reports` | Generated reports |
| `BUG_REPORT_TRANSCRIPTION_TEMP_DIR` | `./data/transcription-temp` | ffmpeg temp |
| `VOSK_SERVICE_URL` | `http://127.0.0.1:8765` | STT sidecar |
| `VOSK_MODELS_DIR` | `./vosk-models` | Model path |
| `FFMPEG_PATH` | `ffmpeg` | ffmpeg binary |
| `VOSK_TRANSCRIBE_TIMEOUT_MS` | `180000` | STT timeout |
| `FEATURE_UNMASK_ENABLED` | `true` | Sensitive unmask feature |
| `FEATURE_AUTOGEN_DEMO_ENABLED` | `true` | Autogen demo feature |

### 7.3 Mail / SMTP

| Variable | Required | Purpose |
|----------|----------|---------|
| `MAIL_ENABLED` | Optional (default false) | Enable SMTP mail |
| `MAIL_DEV_FILE_SINK` | Optional | Dev outbox under `data/mail-outbox/` |
| `APP_PUBLIC_URL` | Optional | Legacy alias for `PUBLIC_APP_URL` |
| `SMTP_HOST` | **Required if `MAIL_ENABLED=true`** | SMTP host |
| `SMTP_PORT` | Optional | Default 587 / 465 |
| `SMTP_SECURE` | Optional | TLS |
| `SMTP_USER` / `SMTP_PASS` | Optional | Auth |
| `SMTP_FROM` | Optional | From header |

### 7.4 Docker / Vosk process env

| Variable | Default | Purpose |
|----------|---------|---------|
| `VOSK_ENABLED` | `false` | Start sidecar in entrypoint |
| `VOSK_HOST` / `VOSK_PORT` | `127.0.0.1` / `8765` | Sidecar bind |
| `VOSK_BLOCK_STARTUP` | `false` | Wait for Vosk before API |
| `FFPROBE_PATH` | optional | Override ffprobe |

### 7.5 Frontend (Vite — **build-time**)

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Absolute API origin (no trailing slash, no `/api`); empty = same-origin + proxy |
| `VITE_DEVICE_API_BASE_URL` | Device/API host when different from SPA proxy |
| `VITE_FEATURE_UNMASK_ENABLED` | Client feature flag |
| `VITE_FEATURE_AUTOGEN_DEMO_ENABLED` | Client feature flag |
| `VITE_APP_VERSION` | Optional version string in bug reports |

### 7.6 Seed scripts only (not runtime)

`SEED_*`, `SEED_ATTENDANCE_*`, `SEED_COMPLIANCE_*`, `FIRST_TIME_USER_*`, `PURGE_BUG_REPORTS_CONFIRM=yes` — see `.env.example` comments.

---

## 8. Database

| Item | Detail |
|------|--------|
| Engine | **MongoDB** |
| ODM | **Mongoose 8** |
| Env | `MONGO_URI` |
| Local example | `mongodb://localhost:27017/mams_dev` |
| Atlas example | `mongodb+srv://USER:PASS@CLUSTER.mongodb.net/DBNAME?retryWrites=true&w=majority` |
| SQL migrations | **None** — schemas via Mongoose models + indexes |
| Seed code | `mams/mams-server/seed/` |

### Seed / maintenance (from `mams/`)

```bash
npm run seed                 # Full demo seed — WIPES master collections
npm run seed:users           # Ensure admin users
npm run seed:attendance      # Attendance backfill
npm run seed:first-time-user --workspace mams-server
npm run seed:compliance-month --workspace mams-server
npm run seed:compliance-today --workspace mams-server
```

**Warning:** Do **not** run `npm run seed` against production customer data unless explicitly requested.

---

## 9. Process managers & PaaS

| Artifact | Path | Status |
|----------|------|--------|
| PM2 | `mams/ops/pm2/ecosystem.config.cjs` | Present (`mams-server` + `mams-vosk`) |
| Docker (slim) | `Dockerfile` (repo root) | Present |
| Docker (full API) | `mams/Dockerfile` | Present |
| Docker (web SPA) | `mams/mams-web/Dockerfile` | Present |
| Entrypoint | `mams/docker-entrypoint.sh` | Present |
| docker-compose (on-prem) | `mams/docker-compose.onprem.yml` | Present |
| systemd units | — | **Not present** |
| Railway | `railway.toml`, `mams/railway.toml` | Docker + health `/api/health` |
| Render | `mams/render.yaml` | Docker web service blueprint |
| Netlify | `mams/netlify.toml` | SPA build + `/api/*` proxy |

### Current known hosting pattern (example)

| Layer | Example |
|-------|---------|
| SPA | Netlify (`hrmsmakson` / Infoloop demo sites) |
| API | Render (`mams-api-*.onrender.com`) or Railway |
| DB | MongoDB Atlas |

Confirm live URLs and secrets in the PaaS dashboards — do not commit credentials.

---

## 10. On-prem Docker (web + API)

Standard split: **API container** (`mams/Dockerfile`) + **web container** (nginx SPA). They are **not** one image. Cloud Netlify/Render/Railway can keep running until cutover.

| Service | Image | Public port |
|---------|-------|-------------|
| `api` | `mams/Dockerfile` (full + Vosk) | internal `3001` only |
| `web` | `mams/mams-web/Dockerfile` | **8089 → 80** (browsers + eSSL Server Port) |

nginx ([`mams/mams-web/nginx.conf`](mams/mams-web/nginx.conf)) proxies `/api/`, `/iclock`, and `/integrations/hanvon` to `api:3001`. SPA uses empty `VITE_API_BASE_URL` / `VITE_DEVICE_API_BASE_URL` (same-origin).

### Build & run

```bash
cd mams

# 1. Env file for API secrets (do not commit)
cp mams-server/.env.example .env.onprem
# Edit .env.onprem:
#   NODE_ENV=production
#   MONGO_URI=...
#   JWT_ACCESS_SECRET=...
#   JWT_REFRESH_SECRET=...
#   CORS_ORIGIN=http://YOUR_HOST:8089
#   PUBLIC_APP_URL=http://YOUR_HOST:8089
# (no trailing slash)

# 2. Start both containers
docker compose -f docker-compose.onprem.yml --env-file .env.onprem up -d --build

# 3. Health
curl -s http://YOUR_HOST:8089/api/health
```

Optional: set `VOSK_ENABLED=true` in `.env.onprem` if bug-report transcription is required on this host.

### Zero-downtime cutover

1. Keep Netlify + Render/Railway running.
2. Bring up compose on a **separate** on-prem host; validate login, attendance, `GET /api/health`.
3. Point eSSL **Server Address** to the on-prem host; keep **Server Port = 8089**.
4. Point users to `http://YOUR_HOST:8089` (or update DNS).
5. Only after stable, decommission cloud hosting.

**Rollback:** revert browser URL and device Server Address to the previous cloud hosts — old stack is untouched.

### Stop / update

```bash
cd mams
docker compose -f docker-compose.onprem.yml --env-file .env.onprem pull   # if using registry images
docker compose -f docker-compose.onprem.yml --env-file .env.onprem up -d --build
docker compose -f docker-compose.onprem.yml down   # stops containers; volume mams_bug_reports is kept
```

---

## 11. Third-party integrations

| Integration | Type | Config |
|-------------|------|--------|
| MongoDB Atlas (or self-hosted) | Database | `MONGO_URI` |
| Nodemailer / SMTP | Email | `MAIL_*`, `SMTP_*` |
| eSSL ADMS | Biometric devices | HTTP `/iclock/*` (serial whitelist in DB) |
| Hanvon | Biometric devices | `/integrations/hanvon/push` + device config in Mongo |
| Vosk | Offline speech-to-text | Local sidecar + `VOSK_*` / ffmpeg |
| Netlify / Render / Railway | Hosting | Platform env + Docker/static |

**Not used:** payment gateways, AWS/Azure/GCP SDKs, S3, SMS/Twilio, OAuth IdPs, Firebase Auth.

**Auth model:** Custom JWT (access + refresh) + bcrypt passwords.

**Media storage:** Local filesystem under `BUG_REPORT_MEDIA_DIR` (mount a persistent volume). Multi-instance without shared storage will break video playback/transcription.

---

## 12. CORS & reverse proxy

### CORS (API — `mams-server/src/app.ts`)

- `app.set('trust proxy', 1)` for correct client IP behind proxies
- Origins from `CORS_ORIGIN` (comma-separated)
- Production also allows `PUBLIC_APP_URL`
- Development always allows `http://localhost:5173` and `http://127.0.0.1:5173`
- `credentials: true`
- Helmet enabled; login rate limit 10/min on `/api/auth/login`

Set production:

```env
CORS_ORIGIN=https://your-spa.example.com
PUBLIC_APP_URL=https://your-spa.example.com
```

(No trailing slash.)

### Netlify proxy pattern (`mams/netlify.toml`)

- Build SPA to `mams-web/dist`
- Redirect `/api/*` → API host `/api/:splat` (status 200)
- SPA fallback `/*` → `/index.html`

Device traffic should target the **API host** (or a dedicated `VITE_DEVICE_API_BASE_URL`), not only the Netlify proxy, depending on network/firewall design.

---

## 13. Production checklist

1. [ ] Node **20.18.x** (or ≥20) and npm ≥10 on build/API hosts  
2. [ ] `npm ci` from `mams/` using `package-lock.json`  
3. [ ] Secrets set: `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`  
4. [ ] `NODE_ENV=production`  
5. [ ] `CORS_ORIGIN` + `PUBLIC_APP_URL` match the live SPA origin  
6. [ ] Persistent volume for `BUG_REPORT_MEDIA_DIR` (and optionally `REPORT_MEDIA_DIR`)  
7. [ ] API build/start: `npm run build:server` + `npm run start:server` **or** Docker  
8. [ ] SPA build with correct `VITE_*` (or Netlify / on-prem nginx proxy with empty `VITE_*`)  
9. [ ] Healthcheck: `GET /api/health` returns 200  
10. [ ] SMTP only if needed (`MAIL_ENABLED` + `SMTP_HOST`)  
11. [ ] Vosk only on **full** image with `VOSK_ENABLED=true`  
12. [ ] Never run full `npm run seed` on live customer DB without approval  
13. [ ] On-prem: `docker compose -f docker-compose.onprem.yml` with `.env.onprem`; public port **8089** 

---

## 14. Command cheat sheet

```bash
# --- versions ---
cd mams
node -v          # expect v20.18.x
npm -v           # expect >= 10

# --- install ---
npm ci

# --- local dev ---
npm run dev:server     # :3001
npm run dev:web        # :5173

# --- production API ---
npm run build:server
npm run start:server   # node dist/index.js

# --- production SPA ---
npm run build --workspace @mams/types
npm run build --workspace mams-web
# → mams-web/dist

# --- health ---
curl -s https://YOUR-API-HOST/api/health

# --- on-prem Docker (web + API on :8089) ---
cd mams
cp mams-server/.env.example .env.onprem   # then edit secrets + CORS/PUBLIC_APP_URL
docker compose -f docker-compose.onprem.yml --env-file .env.onprem up -d --build
curl -s http://YOUR_HOST:8089/api/health

# --- seeds (non-prod) ---
npm run seed:users
# npm run seed   # DESTRUCTIVE full seed
```

### Key file index

| Topic | Path |
|-------|------|
| Node pin | `mams/.nvmrc` |
| Engines / scripts | `mams/package.json` |
| Lockfile | `mams/package-lock.json` |
| React / Vite | `mams/mams-web/package.json` |
| API scripts | `mams/mams-server/package.json` |
| Env schema | `mams/mams-server/src/config/env.ts` |
| Env example | `mams/mams-server/.env.example` |
| Mail env | `mams/mams-server/src/config/mail.ts` |
| PM2 | `mams/ops/pm2/ecosystem.config.cjs` |
| Docker slim | `Dockerfile` |
| Docker full API | `mams/Dockerfile` |
| Docker web SPA | `mams/mams-web/Dockerfile` |
| Web nginx | `mams/mams-web/nginx.conf` |
| On-prem compose | `mams/docker-compose.onprem.yml` |
| Netlify | `mams/netlify.toml` |
| Render | `mams/render.yaml` |
| Railway | `railway.toml`, `mams/railway.toml` |

---

*End of DevOps handoff document. For product/feature SOW, use separate project docs — this file is deploy/ops only.*
