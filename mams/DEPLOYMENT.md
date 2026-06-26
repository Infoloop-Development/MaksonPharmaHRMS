# MAMS deployment — Netlify (web) + MongoDB Atlas + API host

MAMS is a **monorepo** with two runtimes:

| Part | Host | Why |
|------|------|-----|
| **mams-web** (React/Vite) | **Netlify** | Static SPA after `vite build` |
| **mams-server** (Express) | **Render / Railway / VPS** | Long-running Node API + file uploads + device webhooks |
| **MongoDB** | **MongoDB Atlas** | Cloud database (connection string on **server only**) |

Netlify **cannot** run `mams-server` as a normal Express app. The browser never talks to Atlas directly.

---

## Architecture

**Recommended (Netlify proxy — no browser CORS):**

```
Browser  →  https://maksonhrms.netlify.app/api/...   (same origin)
                ↓ Netlify redirect proxy
           https://mams-api-xvso.onrender.com/api/...  (Render: mams-server)
                ↓ MONGO_URI
           Atlas MONGO_URI (Render env only)             (MongoDB Atlas)
```

Leave `VITE_API_BASE_URL` **empty** on Netlify. The SPA calls `/api` on the Netlify host; [`netlify.toml`](netlify.toml) proxies to Render.

**Alternative (direct API URL — requires Render CORS):**

```
Browser  →  https://maksonhrms.netlify.app
                ↓ VITE_API_BASE_URL (cross-origin)
           https://mams-api-xvso.onrender.com
```

Only use this if you must call Render directly from the browser. Set `CORS_ORIGIN` on Render to the **exact** Netlify URL.

---

## 1. MongoDB Atlas

1. Sign in at [https://cloud.mongodb.com](https://cloud.mongodb.com) → **Create cluster** (M0 free tier is fine for demos).
2. **Database Access** → Add user (username + strong password). Save the password.
3. **Network Access** → **Add IP Address**:
   - For Render/Railway: **Allow access from anywhere** (`0.0.0.0/0`) unless your API host gives a fixed egress IP.
   - Tighten later to office/VPN IPs if you move API on-prem.
4. **Database** → **Connect** → **Drivers** → copy the SRV connection string. Append database name and options (`mams_prod?retryWrites=true&w=majority`). **URL-encode** special characters in the password (`@` → `%40`, `#` → `%23`, etc.).

### Seed Atlas (first time)

From your machine (with `MONGO_URI` pointing at Atlas in `mams-server/.env`):

```bash
cd mams
npm run seed
```

Optional tour demo user:

```bash
npm --workspace mams-server run seed:first-time-user
```

---

## 2. API server (example: Render)

Deploy **mams-server** from the same Git repo (`mams` folder as root).

| Setting | Value |
|---------|--------|
| Root directory | `mams` (or repo root if repo is already `mams`) |
| Build command | `npm install && npm run build --workspace mams-server` |
| Start command | `npm run start --workspace mams-server` |

### API environment variables

Copy from `mams-server/.env.example`. **Required in production:**

| Variable | Example | Notes |
|----------|---------|--------|
| `NODE_ENV` | `production` | |
| `PORT` | `3001` | Render sets `PORT` automatically — keep default or use theirs |
| `MONGO_URI` | Atlas connection string (from Connect dialog) | Atlas connection string |
| `JWT_ACCESS_SECRET` | *(32+ random chars)* | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | *(32+ random chars)* | Different from access secret |
| `CORS_ORIGIN` | `https://maksonhrms.netlify.app` | **Exact** Netlify URL, no trailing slash. Comma-separate multiple origins if needed. Required if the browser calls Render directly; still recommended as a safety net. |
| `PUBLIC_APP_URL` | `https://maksonhrms.netlify.app` | Used for visitor form public links & emails |
| `TZ` | `Asia/Kolkata` | |
| `LOG_LEVEL` | `info` | |
| `FEATURE_UNMASK_ENABLED` | `true` or `false` | Demo vs production |

Optional mail (user welcome emails):

| Variable | Example |
|----------|---------|
| `MAIL_ENABLED` | `true` |
| `APP_PUBLIC_URL` | `https://your-app.netlify.app` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Your SMTP provider |

After deploy, note the API URL, e.g. `https://mams-api-xvso.onrender.com` (no `/api` suffix).

**Render dashboard (required once):** Environment → set `CORS_ORIGIN` and `PUBLIC_APP_URL` to `https://maksonhrms.netlify.app`, then **Manual Deploy**. Values in [`render.yaml`](render.yaml) are not applied automatically unless you use Render Blueprint sync.

**Verify CORS after Render deploy:**

```bash
curl -s -D - -o NUL -X OPTIONS "https://mams-api-xvso.onrender.com/api/auth/login" \
  -H "Origin: https://maksonhrms.netlify.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

Expected response header: `access-control-allow-origin: https://maksonhrms.netlify.app`

---

## 3. Netlify (mams-web)

1. Netlify → **Add new site** → **Import from Git** → select `MaksonPharmaHRMS` (or your repo).
2. If the repo root is the `mams` folder, Netlify reads [`netlify.toml`](netlify.toml) automatically:
   - **Build:** `npm install && npm run build --workspace mams-web`
   - **Publish:** `mams-web/dist`
3. If the repo root is **above** `mams`, set:
   - **Base directory:** `mams`
   - Build/publish as in `netlify.toml`

### Netlify environment variables

Site settings → **Environment variables** → **Production**:

| Key | Value | Required |
|-----|--------|----------|
| `VITE_API_BASE_URL` | *(leave unset)* | **No** — use same-origin `/api` via Netlify proxy (see [`netlify.toml`](netlify.toml)). **Remove** this var if it was set previously. |
| `VITE_FEATURE_UNMASK_ENABLED` | `true` or `false` | Optional (default true) |
| `VITE_FEATURE_AUTOGEN_DEMO_ENABLED` | `false` | Recommended off in production |

**Important:** Vite bakes `VITE_*` at **build time**. After changing env vars, trigger **Clear cache and deploy site**.

### Custom domain

If you use a custom domain on Netlify:

- Set `CORS_ORIGIN` and `PUBLIC_APP_URL` on Render to that same URL.
- Keep `VITE_API_BASE_URL` unset unless you intentionally call the API cross-origin.

---

## 4. Local `.env` templates (production values)

### `mams-server/.env` (API host — **not** committed to Git)

```env
NODE_ENV=production
PORT=3001
MONGO_URI=<paste-from-atlas-connect-dialog>
JWT_ACCESS_SECRET=your-long-random-secret-here
JWT_REFRESH_SECRET=another-long-random-secret-here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=https://maksonhrms.netlify.app
PUBLIC_APP_URL=https://maksonhrms.netlify.app
LOG_LEVEL=info
TZ=Asia/Kolkata
SMART_ANCHOR_VERSION=v2.0.0
FEATURE_UNMASK_ENABLED=true
MAIL_ENABLED=false
```

### `mams-web/.env` (local dev only)

```env
# Leave empty — Vite proxies /api to localhost:3001
VITE_API_BASE_URL=
VITE_FEATURE_UNMASK_ENABLED=true
VITE_FEATURE_AUTOGEN_DEMO_ENABLED=false
```

On Netlify, do **not** set `VITE_API_BASE_URL` (use the `/api` proxy in `netlify.toml`).

---

## 5. Checklist after deploy

- [ ] API health: `https://mams-api-xvso.onrender.com/api/health` returns `{"status":"ok"}`.
- [ ] Login works at `https://maksonhrms.netlify.app` (`hr.admin@makson-group.com` after seed).
- [ ] Browser devtools → Network: login goes to `https://maksonhrms.netlify.app/api/auth/login` (not Render directly).
- [ ] If using direct Render URL in browser: curl OPTIONS shows `access-control-allow-origin` (see §2).
- [ ] Visitor public form links use `PUBLIC_APP_URL` (check a form’s “copy link” URL).
- [ ] Biometric devices: punch URL must hit your **API** host (`/iclock/...`), not Netlify.

---

## 6. What stays on-prem (optional)

Biometric devices often need a **stable LAN or VPN** endpoint for `/iclock` webhooks. Many teams run:

- **Netlify** — HR web UI  
- **Cloud API + Atlas** — app data  
- **On-prem gateway or VPN** — device traffic to API  

See `ops/nginx/mams.conf.example` for a single-host reverse-proxy layout.
