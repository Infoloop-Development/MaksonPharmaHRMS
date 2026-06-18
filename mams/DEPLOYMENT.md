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

```
Browser  →  https://your-app.netlify.app     (Netlify: mams-web)
                ↓ VITE_API_BASE_URL
           https://your-api.onrender.com      (API: mams-server)
                ↓ MONGO_URI
           mongodb+srv://...mongodb.net/...    (MongoDB Atlas)
```

---

## 1. MongoDB Atlas

1. Sign in at [https://cloud.mongodb.com](https://cloud.mongodb.com) → **Create cluster** (M0 free tier is fine for demos).
2. **Database Access** → Add user (username + strong password). Save the password.
3. **Network Access** → **Add IP Address**:
   - For Render/Railway: **Allow access from anywhere** (`0.0.0.0/0`) unless your API host gives a fixed egress IP.
   - Tighten later to office/VPN IPs if you move API on-prem.
4. **Database** → **Connect** → Drivers → copy the **connection string**, e.g.  
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/`
5. Append database name and options:  
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/mams_prod?retryWrites=true&w=majority`
6. **URL-encode** special characters in the password (`@` → `%40`, `#` → `%23`, etc.).

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
| `MONGO_URI` | `mongodb+srv://...` | Atlas connection string |
| `JWT_ACCESS_SECRET` | *(32+ random chars)* | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | *(32+ random chars)* | Different from access secret |
| `CORS_ORIGIN` | `https://your-app.netlify.app` | **Exact** Netlify URL, no trailing slash |
| `PUBLIC_APP_URL` | `https://your-app.netlify.app` | Used for visitor form public links & emails |
| `TZ` | `Asia/Kolkata` | |
| `LOG_LEVEL` | `info` | |
| `FEATURE_UNMASK_ENABLED` | `true` or `false` | Demo vs production |

Optional mail (user welcome emails):

| Variable | Example |
|----------|---------|
| `MAIL_ENABLED` | `true` |
| `APP_PUBLIC_URL` | `https://your-app.netlify.app` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Your SMTP provider |

After deploy, note the API URL, e.g. `https://mams-api.onrender.com` (no `/api` suffix).

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

Site settings → **Environment variables** → **Production** (and Preview if needed):

| Key | Value | Required |
|-----|--------|----------|
| `VITE_API_BASE_URL` | `https://mams-api.onrender.com` | **Yes** — full API origin, **no** trailing slash, **no** `/api` |
| `VITE_FEATURE_UNMASK_ENABLED` | `true` or `false` | Optional (default true) |
| `VITE_FEATURE_AUTOGEN_DEMO_ENABLED` | `false` | Recommended off in production |

**Important:** Vite bakes `VITE_*` at **build time**. After changing env vars, trigger **Clear cache and deploy**.

### Custom domain

If you use `https://mams.makson-group.com` on Netlify:

- Set `CORS_ORIGIN` and `PUBLIC_APP_URL` on the API to that same URL.
- Set `VITE_API_BASE_URL` to your API URL (can be `https://api.makson-group.com`).

---

## 4. Local `.env` templates (production values)

### `mams-server/.env` (API host — **not** committed to Git)

```env
NODE_ENV=production
PORT=3001
MONGO_URI=mongodb+srv://USER:ENCODED_PASSWORD@cluster0.xxxxx.mongodb.net/mams_prod?retryWrites=true&w=majority
JWT_ACCESS_SECRET=your-long-random-secret-here
JWT_REFRESH_SECRET=another-long-random-secret-here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=https://your-app.netlify.app
PUBLIC_APP_URL=https://your-app.netlify.app
LOG_LEVEL=info
TZ=Asia/Kolkata
SMART_ANCHOR_VERSION=v2.0.0
FEATURE_UNMASK_ENABLED=true
MAIL_ENABLED=false
```

### `mams-web/.env` (only needed for **local** production builds)

```env
VITE_API_BASE_URL=https://mams-api.onrender.com
VITE_FEATURE_UNMASK_ENABLED=true
VITE_FEATURE_AUTOGEN_DEMO_ENABLED=false
```

On Netlify you set these in the UI instead of a file.

---

## 5. Checklist after deploy

- [ ] API health: open `https://YOUR-API-URL/api/...` or login from the Netlify site.
- [ ] Login works (`hr.admin@makson-group.com` after seed).
- [ ] Browser devtools → Network: requests go to `VITE_API_BASE_URL/api/...`, not `localhost`.
- [ ] Visitor public form links use `PUBLIC_APP_URL` (check a form’s “copy link” URL).
- [ ] Biometric devices: punch URL must hit your **API** host (`/iclock/...`), not Netlify.

---

## 6. What stays on-prem (optional)

Biometric devices often need a **stable LAN or VPN** endpoint for `/iclock` webhooks. Many teams run:

- **Netlify** — HR web UI  
- **Cloud API + Atlas** — app data  
- **On-prem gateway or VPN** — device traffic to API  

See `ops/nginx/mams.conf.example` for a single-host reverse-proxy layout.
