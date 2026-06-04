# Makson Pharma HRMS (MAMS)

**Makson Attendance Management System (MAMS)** — Phase 1 of the Makson Pharma HRMS platform. On-prem MERN stack for factory attendance: real **12-hour shift** tracking, dual HR views, Smart Anchor compliance derivation, and **eSSL + Hanvon** biometric device integration.

Repository: [github.com/PremPMehta/MaksonPharamaHRMS](https://github.com/PremPMehta/MaksonPharamaHRMS)

## Features

| Area | Description |
|------|-------------|
| **Attendance (real view)** | 12-hour shift logic for operations (`hr.admin`) |
| **Compliance view** | 8-hour Smart Anchor derivation for statutory reporting (`hr.compliance`) |
| **Employees** | CRUD, sensitive-field masking, audit on unmask |
| **Biometric devices** | Register, sync, and monitor eSSL / Hanvon on the **Devices** page (connection state, go-live checklist) |
| **Punch ingestion** | Append-only `attendance_raw`; idempotent vendor adapters (eSSL ADMS, Hanvon push/pull) |
| **Dashboard & audit** | Stats, recent punches, audit log infrastructure |

### Biometric connection states

After HR registers a device in MAMS, attendance only flows once hardware is configured and sending punches:

- **Pending setup** — device saved, no ping from hardware yet  
- **Waiting for first punch** — device online, no punches in 24h  
- **Live** — punches received in the last 24h  

Employee **Biometric ID** on the device must match **Biometric ID** in MAMS Employees.

See [docs/device-compatibility-matrix.md](docs/device-compatibility-matrix.md) for vendor endpoints, [docs/biometric-go-live-runbook.md](docs/biometric-go-live-runbook.md) for rollout steps, [docs/go-live-review-backlog.md](docs/go-live-review-backlog.md) for open items to review before production, and [docs/responsive-qa-checklist.md](docs/responsive-qa-checklist.md) for mobile/tablet/laptop UI testing.

## Tech stack

- **API:** Node.js, Express, Mongoose, TypeScript (`mams/mams-server`)
- **Web:** Vite, React, TypeScript, Tailwind (`mams/mams-web`)
- **Contracts:** Shared Zod schemas (`mams/shared/types`)
- **Database:** MongoDB (UTC storage, IST display)

## Quick start

Prerequisites: **Node.js 20+**, **MongoDB** on `localhost:27017`, **npm 10+**.

```bash
cd mams
npm install

cp mams-server/.env.example mams-server/.env
cp mams-web/.env.example mams-web/.env
# Set JWT secrets in mams-server/.env (e.g. openssl rand -base64 32)

npm run seed
npm run dev:server   # http://localhost:3001
npm run dev:web      # http://localhost:5173
```

**Demo logins (seed data)**

| User | Password | View |
|------|----------|------|
| `hr.admin@makson-group.com` | `makson2026` | Real 12-hour shifts |
| `hr.compliance@makson-group.com` | `makson2026` | Compliance 8-hour view |

### Windows helper

From `mams/` (adjust portable tool paths in the script if needed):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-local-windows.ps1
```

### Local device simulators

```bash
cd mams
node scripts/essl-sim.js
node scripts/hanvon-sim.js
```

## Repository layout

```
├── mams/                 Application monorepo (server, web, shared types)
├── docs/                 Product & integration docs
├── mockup/               HTML prototype (reference UI)
├── CLAUDE.md             Project context for AI-assisted development
├── DEVELOPER-HANDOFF.md  Original handoff notes
└── HANDOFF-PROMPT.md     Onboarding prompt for new developers
```

Detailed app README: [mams/README.md](mams/README.md)

## Scripts (from `mams/`)

| Command | Purpose |
|---------|---------|
| `npm run dev:server` | API on port 3001 |
| `npm run dev:web` | SPA on port 5173 |
| `npm run seed` | Seed DB (employees, devices, sample attendance) |
| `npm run test` | Server unit tests (Vitest) |
| `npm run typecheck` | TypeScript across workspaces |
| `npm run build` | Production build |

## Security & operations

- Deploy **on-prem only** — no cloud runtime dependencies for production data.
- Never commit `.env` files; use `.env.example` as templates.
- Biometric raw records are **append-only** (no edit/delete of source punches).
- Rotate JWT secrets and device push tokens before production.

## License

Proprietary — Makson Group / Infoloop. All rights reserved unless otherwise agreed in writing.
