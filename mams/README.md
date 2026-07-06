# MAMS - Makson Attendance Management System

MERN monorepo for the MAMS Phase 1 build.

## Quick start

```bash
# 1. Install
nvm use
npm install

# 2. Make sure MongoDB is running locally on port 27017

# 3. Configure env
cp mams-server/.env.example mams-server/.env
cp mams-web/.env.example mams-web/.env
# Edit JWT secrets in mams-server/.env (generate with: openssl rand -base64 32)

# 4. Seed the database (1,800 mock employees + attendance + audit + leave demo data)
#    Run from the mams/ folder (not the repo root).
#    Optional: set SEED_DEMO_ANCHOR_DATE=2026-06-18 in mams-server/.env to pre-load the
#    demo week (12–18 Jun) for Admin Overview charts/tables while keeping the rolling 7-day window.
npm run seed

# 5. Run dev servers (in two terminals)
npm run dev:server   # http://localhost:3001
npm run dev:web      # http://localhost:5173

# 6. Login
# hr.admin@makson-group.com / makson2026   (real view, 12-hour shifts; manage.leave for holidays/quotas)
# hr.compliance@makson-group.com / makson2026  (compliant view, 8-hour shifts; read-only leave)
#
# Leave module: sidebar → Leave → Holidays (national/company holidays), Quotas, Leave Settings.
# App-wide settings (users, devices): sidebar → Settings. A link card on Settings points to Leave.

# Optional — welcome email when creating users (Settings → Add User)
# Set MAIL_ENABLED=true and SMTP_* in mams-server/.env (on-prem relay in prod; Mailtrap or local Mailhog on 1025 for dev).
# APP_PUBLIC_URL must match the URL users open in the browser (e.g. http://localhost:5173).
```

## Bug report video transcription (offline Vosk)

Admin bug report detail can transcribe screen recordings offline (English, Hindi, Gujarati). No cloud speech APIs.

**Prerequisites**

- [ffmpeg](https://ffmpeg.org/) on `PATH` (or set `FFMPEG_PATH` in `mams-server/.env`)
- Python 3.11+ with pip
- Vosk models (~165 MB total):

```bash
npm run vosk:models
pip install -r mams-server/vosk-service/requirements.txt
```

**Local dev (three terminals)**

```bash
npm run dev:vosk      # Python Vosk service on http://127.0.0.1:8765
npm run dev:server    # Node API (uses VOSK_SERVICE_URL from .env)
npm run dev:web
```

In Admin → Bug Reporting → open a report with a screen recording → **Get Transcription**.

**Production (Render Docker)**

The API image bundles Node 20, Python 3.11, ffmpeg, and Vosk models. `docker-entrypoint.sh` starts the Vosk microservice, then the Node server. See `Dockerfile` and `render.yaml`.

**On-prem (PM2)**

`ops/pm2/ecosystem.config.cjs` includes `mams-vosk` alongside `mams-server`. Create a venv at `/opt/mams/vosk-venv`, install `mams-server/vosk-service/requirements.txt`, run `npm run vosk:models` into `mams-server/vosk-models/`, then `pm2 start ecosystem.config.cjs`.

## Repo layout

```
mams/
  shared/types/      Zod schemas + inferred TS types - single source of truth for API contracts
  mams-server/       Express + Mongoose + TS - API, Smart Anchor v2, eSSL push receiver
  mams-web/          Vite + React + TS + Tailwind - SPA
  ops/
    nginx/           Nginx reverse-proxy config example
    pm2/             PM2 process supervisor config
```

## Reference docs

- Approved mockup: https://makson-payroll-mockup.netlify.app
- System Architecture Document: `../docs/tech/01_System_Architecture_Document.pdf`
- Database Schema Reference: `../docs/tech/02_Database_Schema_Reference.pdf`
- eSSL ADMS Protocol Cheat-sheet: `../docs/tech/03_eSSL_ADMS_Protocol_Cheatsheet.pdf`
- Local Dev Setup Guide: `../docs/tech/04_Local_Dev_Setup_Guide.pdf`
- Project context: `../CLAUDE.md`
- Functional scope: `../docs/development-scope.md`

## What's done in this scaffold

| Module | Status |
|---|---|
| Auth (login, refresh, logout) | Complete |
| Employees (list, detail, create, update, sensitive-field masking) | Complete |
| Attendance capture (eSSL ADMS + Hanvon SDK push/pull) | Complete |
| Smart Anchor v2 (deterministic compliance punch derivation) | Complete with tests |
| Dashboard (stats, recent attendance) | Complete |
| Audit log infrastructure | Complete |
| Adjustments | API stub + page stub - team to flesh out |
| Reports (PDF/CSV export) | API stub + page stub - team to flesh out |
| Devices admin (eSSL + Hanvon vendor registry, sync, test) | Complete |
| Settings | API stub + page stub - team to flesh out |
| CSV bulk import | Complete (Employees → Import CSV) |
| E2E tests | TODO - team to flesh out |

Stubs are marked with `// TODO(team):` comments throughout the source.

## House rules

See `../CLAUDE.md` §12. Highlights:
- Hours are source of truth (never let a day-based calc sneak in).
- Dual view at the query layer, not the table layer.
- Smart Anchor MUST be deterministic - same employeeId+date+raw input always yields the same compliant output.
- Sensitive fields (Aadhaar, PAN, bank, PF, ESI) are masked by default; unmasking is role-gated and audit-logged.
- Original biometric records are never deleted, edited, or overwritten.
- Timezone: store UTC, display IST (`Asia/Kolkata`).
- On-prem only - no cloud services at runtime.
