# Deploy MAMS on Netlify + Railway

This guide deploys:

| Piece | Host | What it runs |
|-------|------|----------------|
| **Web SPA** | [Netlify](https://www.netlify.com/) | `mams-web` (Vite build) |
| **API** | [Railway](https://railway.app/) | `mams-server` via Docker (`mams/Dockerfile`) |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/atlas) | Same cluster you already use (or a new one) |

Repo layout (GitHub root = `MaksonPharmaHRMS`):

```
MaksonPharmaHRMS/
  mams/
    Dockerfile          ← Railway image
    netlify.toml        ← Netlify build + /api proxy
    mams-server/
    mams-web/
    shared/types/
```

Today production often uses **Render** for the API. This doc swaps that host to **Railway**; Netlify stays the same pattern (SPA + `/api` proxy).

---

## 0. Prerequisites

1. GitHub access to the repo.
2. Netlify account.
3. Railway account.
4. MongoDB Atlas project + connection string (`MONGO_URI`).
5. Local tools (optional, for seed): Node 20+, ability to run `npm run seed` against Atlas.

Generate JWT secrets (run twice):

```bash
openssl rand -base64 32
```

---

## 1. MongoDB Atlas

1. Open Atlas → your cluster → **Connect** → **Drivers**.
2. Copy the SRV URI; put the app DB name in the path (e.g. `...mongodb.net/mams_dev?...` or `mams_prod`).
3. **Network Access** → allow Railway to connect:
   - Either **Allow Access from Anywhere** (`0.0.0.0/0`) for demos, or
   - Add Railway egress IPs if you restrict later.
4. Keep the URI ready for Railway secrets (never commit it).

Optional — seed fake data from your machine (wipes master collections):

```bash
cd mams
# Put MONGO_URI + JWT_* in mams-server/.env
npm run seed
```

Demo logins after seed (default password `makson2026`):

- `hr.admin@makson-group.com`
- `hr.compliance@makson-group.com`
- `org.admin@makson-group.com`
- `it.admin@makson-group.com`

---

## 2. Deploy API on Railway

### 2.1 Create the service

1. Railway → **New Project** → **Deploy from GitHub repo**.
2. Select `MaksonPharmaHRMS` (or your fork).
3. Add a service → **Dockerfile**.

### 2.2 Build settings

| Setting | Value |
|---------|--------|
| **Root Directory** | `mams` |
| **Dockerfile Path** | `Dockerfile` (relative to root directory) |
| **Watch Paths** (optional) | `mams/**` |

Railway must build from the `mams/` folder so `COPY package.json`, `shared/types`, etc. resolve correctly (same as Render’s `rootDir: mams`).

### 2.3 Environment variables

In the Railway service → **Variables**, set:

| Key | Value / notes |
|-----|----------------|
| `NODE_ENV` | `production` |
| `TZ` | `Asia/Kolkata` |
| `LOG_LEVEL` | `info` |
| `MONGO_URI` | Atlas connection string (**secret**) |
| `JWT_ACCESS_SECRET` | From `openssl rand -base64 32` (**secret**) |
| `JWT_REFRESH_SECRET` | Different random string (**secret**) |
| `JWT_ACCESS_EXPIRES` | `15m` |
| `JWT_REFRESH_EXPIRES` | `7d` |
| `SMART_ANCHOR_VERSION` | `v2.0.0` (or match your env) |
| `FEATURE_UNMASK_ENABLED` | `true` or `false` |
| `COMPLIANCE_AUTOGEN_ENABLED` | `false` until verified |
| `REPORT_JOBS_ENABLED` | `true` |
| `MAIL_ENABLED` | `false` until SMTP is ready |
| `CORS_ORIGIN` | Your Netlify URL, **no trailing slash** (e.g. `https://YOUR-SITE.netlify.app`) |
| `PUBLIC_APP_URL` | Same as `CORS_ORIGIN` |
| `BUG_REPORT_MEDIA_DIR` | `/var/data/bug-reports` |
| `BUG_REPORT_TRANSCRIPTION_TEMP_DIR` | `/tmp/mams-transcription` |
| `VOSK_SERVICE_URL` | `http://127.0.0.1:8765` |
| `VOSK_MODELS_DIR` | `/app/mams/mams-server/vosk-models` |

**Do not hardcode `PORT`.** Railway injects `PORT`; the server reads `env.PORT`.

Update `CORS_ORIGIN` / `PUBLIC_APP_URL` again after you know the final Netlify URL (or custom domain).

### 2.4 Persistent volume (bug report videos)

Bug recordings are stored on disk. Ephemeral containers lose them on redeploy.

1. Railway service → **Volumes** (or Settings → Volumes).
2. Mount a volume at `/var/data/bug-reports` (must match `BUG_REPORT_MEDIA_DIR`).

### 2.5 Networking / public URL

1. Settings → **Networking** → generate a public domain  
   e.g. `https://mams-api-production-xxxx.up.railway.app`
2. Health check path: `/api/health`  
   Expected JSON includes `"status":"ok"`.
3. Copy this base URL — you need it for Netlify’s `/api` proxy and device webhooks.

### 2.6 First deploy notes

- First Docker build downloads Vosk models (~165 MB) and can take **10–20+ minutes**.
- Image includes Node 20, Python, ffmpeg, and the Vosk sidecar (`docker-entrypoint.sh`).
- After deploy: open `https://YOUR-RAILWAY-HOST/api/health` in a browser.

---

## 3. Deploy web on Netlify

### 3.1 Point Netlify at the repo

1. Netlify → **Add new site** → **Import from Git**.
2. Choose the same GitHub repo / branch (`main` or `production`).

### 3.2 Build settings

`mams/netlify.toml` already defines the important bits. Confirm in the UI:

| Setting | Value |
|---------|--------|
| **Base directory** | `mams` |
| **Build command** | `npm install && npm run build --workspace @mams/types && npm run build --workspace mams-web` |
| **Publish directory** | `mams-web/dist` |

Environment (Site → Environment variables):

| Key | Value |
|-----|--------|
| `VITE_API_BASE_URL` | leave **empty** (or unset) so the SPA uses same-origin `/api` |
| `VITE_FEATURE_UNMASK_ENABLED` | `true` / `false` |
| `VITE_FEATURE_AUTOGEN_DEMO_ENABLED` | `true` / `false` |
| `VITE_DEVICE_API_BASE_URL` | `https://YOUR-RAILWAY-HOST` (no `/api`, no trailing slash) |

`VITE_*` values are baked in at **build** time. Change them → **Trigger deploy**.

### 3.3 Proxy `/api` to Railway

Edit `mams/netlify.toml` so the API redirect targets **Railway**, not Render:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://YOUR-RAILWAY-HOST/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Commit and push, or edit in the Netlify UI (**Redirects**) with the same rules. Order matters: `/api/*` **before** the SPA fallback.

Keep `VITE_API_BASE_URL` empty. If you set it to the Railway URL, the browser calls Railway directly and must rely on CORS only (proxy is preferred).

### 3.4 Deploy and note the site URL

1. Trigger deploy; wait for success.
2. Site URL example: `https://YOUR-SITE.netlify.app`
3. Go back to Railway and set:
   - `CORS_ORIGIN=https://YOUR-SITE.netlify.app`
   - `PUBLIC_APP_URL=https://YOUR-SITE.netlify.app`
4. Redeploy Railway (or restart) so CORS picks up the change.

---

## 4. Wire everything together (checklist)

```text
Browser → https://YOUR-SITE.netlify.app
       → /api/*  (Netlify proxy)
       → https://YOUR-RAILWAY-HOST/api/*
       → MongoDB Atlas
```

1. [ ] `GET https://YOUR-RAILWAY-HOST/api/health` → `ok`
2. [ ] Open Netlify site → login works
3. [ ] Network tab: API calls go to `YOUR-SITE.netlify.app/api/...` (not blocked by CORS)
4. [ ] Railway volume mounted for bug-report media
5. [ ] Atlas Network Access allows Railway
6. [ ] Device webhooks (if used) hit Railway host, not Netlify  
   (`/iclock` etc. on the API public URL)

---

## 5. Custom domains (optional)

### Netlify

1. Domain management → add domain → follow DNS instructions.
2. Update Railway `CORS_ORIGIN` and `PUBLIC_APP_URL` to the custom HTTPS URL.
3. Redeploy / restart API.

### Railway

1. Settings → Custom domain → point DNS as instructed.
2. Update Netlify `/api` redirect `to = "https://api.yourdomain.com/api/:splat"`.
3. Update `VITE_DEVICE_API_BASE_URL` and rebuild Netlify.

---

## 6. Branches / environments

Common pattern for this project:

| Branch | Netlify site | Railway service | Atlas DB |
|--------|--------------|-----------------|----------|
| `main` | staging / preview | staging API | `mams_dev` |
| `production` | production site | production API | `mams_prod` (recommended) |

Use **separate** JWT secrets and Mongo DB names per environment.

---

## 7. Post-deploy ops

### Seed / reseed

Run from a trusted machine with `MONGO_URI` pointing at the target DB:

```bash
cd mams
npm run seed                 # full wipe + fake employees/attendance
npm run seed:users           # ensure demo users only
npm run seed:attendance      # backfill attendance days
npm run seed:compliance-today
```

**Warning:** `npm run seed` deletes users, employees, devices, attendance, leave, audit in that database.

### Mail (optional)

Set on Railway when ready:

- `MAIL_ENABLED=true`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `PUBLIC_APP_URL` = live Netlify (or custom) URL

### Compliance nightly job

Leave `COMPLIANCE_AUTOGEN_ENABLED=false` until `/compliance-attendance` is verified, then enable or call the cron endpoint with `COMPLIANCE_AUTOGEN_CRON_SECRET`.

---

## 8. Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| Netlify build fails on workspaces | Base directory must be `mams`; Node 20+ |
| Login / API 502 from browser | Wrong Railway URL in `netlify.toml` redirect; check Railway is up |
| CORS errors | `CORS_ORIGIN` must exactly match the browser origin (scheme + host, no trailing `/`) |
| `MONGO` connection errors | Atlas IP allowlist; URI user/password; DB name in path |
| Blank app after refresh | SPA redirect `/* → /index.html` missing or after `/api` rule incorrectly |
| Bug videos disappear | Volume not mounted at `BUG_REPORT_MEDIA_DIR` |
| Device punches not landing | Devices must POST to Railway public URL, not Netlify |
| First Railway build timeout | Increase build timeout / retry; Vosk download is large |

Health:

```bash
curl -s https://YOUR-RAILWAY-HOST/api/health
```

---

## 9. Diff from current Render setup

| Item | Render (current) | Railway (this guide) |
|------|------------------|----------------------|
| Blueprint | `mams/render.yaml` | Manual service + env vars |
| Image | Same `mams/Dockerfile` | Same |
| Netlify proxy target | `mams-api-….onrender.com` | Your Railway `*.up.railway.app` (or custom) |
| Persistent disk | Render disk | Railway volume at `/var/data/bug-reports` |

You can keep Render running until Railway health + Netlify proxy are verified, then switch the `netlify.toml` redirect and retire Render.

---

## Quick reference — copy/paste env

**Railway (minimum secrets):**

```env
NODE_ENV=production
TZ=Asia/Kolkata
MONGO_URI=mongodb+srv://USER:PASS@CLUSTER/mams_dev?retryWrites=true&w=majority
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
CORS_ORIGIN=https://YOUR-SITE.netlify.app
PUBLIC_APP_URL=https://YOUR-SITE.netlify.app
BUG_REPORT_MEDIA_DIR=/var/data/bug-reports
VOSK_SERVICE_URL=http://127.0.0.1:8765
VOSK_MODELS_DIR=/app/mams/mams-server/vosk-models
```

**Netlify:**

```env
# leave VITE_API_BASE_URL unset
VITE_FEATURE_UNMASK_ENABLED=true
VITE_FEATURE_AUTOGEN_DEMO_ENABLED=true
VITE_DEVICE_API_BASE_URL=https://YOUR-RAILWAY-HOST
```

**netlify.toml proxy:**

```toml
[[redirects]]
  from = "/api/*"
  to = "https://YOUR-RAILWAY-HOST/api/:splat"
  status = 200
  force = true
```
