# MAMS Developer Handoff

**Project:** Makson Attendance Management System (MAMS)
**Client:** Makson Pharmaceuticals (India) Pvt. Ltd. — Surendranagar, Gujarat
**Provider:** Infoloop Technologies LLP
**Project Lead / SPOC:** Nimit Kaneria — `Nimit.Kaneria@infoloop.co` — `+91 97261 81000`
**Kickoff:** Wednesday 29 April 2026 · **Target handover:** Week of 24 June 2026 (8–10 weeks)
**This document version:** v1 · 30 April 2026

---

## 1. What you have received

This handoff package contains **everything** the engineering team needs to build MAMS Phase 1, organised in a single `mams-handoff/` folder:

| Category | Where | What |
|---|---|---|
| **Master context** | [`CLAUDE.md`](CLAUDE.md) | Project context, house rules, decisions already made. **Read first.** |
| **This document** | [`DEVELOPER-HANDOFF.md`](DEVELOPER-HANDOFF.md) | The transmittal — reading order, quick start, sprint plan |
| **Functional scope** | [`docs/development-scope.md`](docs/development-scope.md) (+ DOCX/PDF) | What the team is being asked to build, module by module |
| **Technical specs** | [`docs/tech/`](docs/tech/) | 4 branded PDFs: SAD, DB Schema, eSSL ADMS, Setup Guide |
| **Production scaffold** | [`mams/`](mams/) | MERN monorepo, runnable. The starting codebase. |
| **Visual reference** | [`mockup/`](mockup/) and [`mockup-vite/`](mockup-vite/) | The approved UX prototype, in two flavours |
| **Approved mockup live** | https://makson-payroll-mockup.netlify.app | The deployed mockup the Client signed off on |
| **Legal docs (reference)** | [`final-docs/v2/`](final-docs/v2/) | Signed contractual scope. The team does not sign these but should know what was committed. |
| **Dev server config** | [`.claude/launch.json`](.claude/launch.json) | Pre-configured dev server launchers |

---

## 2. Reading order (first 4 hours)

Read these in this order. Do not skip ahead.

| # | Time | What | Why |
|---|---|---|---|
| 1 | 15 min | [`CLAUDE.md`](CLAUDE.md) | Project context, who's involved, hours-as-source-of-truth, dual-credential, all the architectural non-negotiables. **The single most important document.** |
| 2 | 10 min | [`DEVELOPER-HANDOFF.md`](DEVELOPER-HANDOFF.md) (this doc) | Reading order + sprint plan |
| 3 | 30 min | [`docs/development-scope.md`](docs/development-scope.md) | All 8 modules in functional detail, what's IN and what's OUT |
| 4 | 60 min | [`docs/tech/01_System_Architecture_Document.pdf`](docs/tech/01_System_Architecture_Document.pdf) | Tier breakdown, key technical decisions with rationale, security architecture, deployment topology |
| 5 | 45 min | [`docs/tech/02_Database_Schema_Reference.pdf`](docs/tech/02_Database_Schema_Reference.pdf) | Field-by-field collection spec for all 11 collections. The data layer ground truth. |
| 6 | 30 min | [`docs/tech/03_eSSL_ADMS_Protocol_Cheatsheet.pdf`](docs/tech/03_eSSL_ADMS_Protocol_Cheatsheet.pdf) | Wire protocol for biometric device integration |
| 7 | 30 min | [`docs/tech/04_Local_Dev_Setup_Guide.pdf`](docs/tech/04_Local_Dev_Setup_Guide.pdf) | Step-by-step "your laptop to running app" |
| 8 | 30 min | Browse https://makson-payroll-mockup.netlify.app | The visual / behavioural source of truth — every screen, every interaction |

Total: **~4 hours.** After this, you should know what's being built, why it's being built that way, and how to set up your local environment.

---

## 3. Quick start (the 5-command setup)

```bash
# 0. Make sure MongoDB is running locally
brew services start mongodb-community@7.0     # or: docker run -d -p 27017:27017 mongo:7

# 1. Clone / extract this folder, cd in
cd mams-handoff/mams

# 2. Install workspace dependencies (313 packages, ~25 sec)
npm install

# 3. Generate JWT secrets and write .env
cp mams-server/.env.example mams-server/.env
sed -i '' "s|JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$(openssl rand -base64 32)|" mams-server/.env
sed -i '' "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(openssl rand -base64 32)|" mams-server/.env
cp mams-web/.env.example mams-web/.env

#    `mams-server/.env` is resolved from the package directory (not shell cwd), so `MONGO_URI`
#    is identical for `npm run seed` and `npm run dev:server` — see `mams-server/src/config/env.ts`.
#    Optional: set `SEED_*` in `mams-server/.env` to change seeded user emails/password (see `.env.example`).

# 4. Seed the database
#    Creates: 2 users, 9 devices, 1,800 employees, ~25,000 raw punches over 7 days,
#    ~12,600 derived records via Smart Anchor v2. Takes ~30-60 seconds.
npm run seed

# 5. Run dev servers (in two terminals)
npm run dev:server     # http://localhost:3001
npm run dev:web        # http://localhost:5173

# Login at http://localhost:5173
#   hr.admin@makson-group.com  / makson2026   (real, 12-hour view)
#   hr.compliance@makson-group.com / makson2026  (compliant, 8-hour view)
```

Optional — to see the live attendance log update with simulated punches:

```bash
node scripts/essl-sim.js     # pushes fake punches every minute
```

---

## 4. What's already built (the scaffold)

The starter codebase at `mams/` is a fully runnable MERN monorepo (**70+** TypeScript modules under `mams-server/src` and `mams-web/src`, plus `shared/types`). Run **`npm run validate`** before commits: typecheck, lint, and Smart Anchor unit tests.

| Layer / Module | Status | Where |
|---|---|---|
| Monorepo + workspaces (npm workspaces) | ✅ Complete | `mams/package.json` |
| Shared types (Zod schemas + inferred TS) | ✅ Complete | `mams/shared/types/src/` |
| Auth: login, refresh rotation, lockout, audit | ✅ Complete | `mams/mams-server/src/services/auth.service.ts`, `routes/auth.routes.ts` |
| Employees: list, detail, masking, role-gated unmask, audit | ✅ Complete | `mams/mams-server/src/routes/employees.routes.ts` |
| **CSV bulk import** (template + POST body, validated rows, audit) | ✅ Complete | `mams/mams-server/src/routes/csvImport.routes.ts` · UI on `mams/mams-web/src/pages/Employees.tsx` |
| Attendance: eSSL ADMS push receiver, raw insert | ✅ Complete | `mams/mams-server/src/routes/essl.routes.ts` |
| **Smart Anchor v2** — deterministic compliant-punch derivation | ✅ Complete + tested | `mams/mams-server/src/services/smartAnchor.ts` |
| Hours decomposition (real / compliant / OT / day type) | ✅ Complete | `mams/mams-server/src/services/smartAnchor.ts` |
| Dashboard: stats, weekly trend | ✅ Complete | `mams/mams-server/src/routes/dashboard.routes.ts` |
| **Adjustments** — create, list, single + bulk approve/reject, audit, recompute derived | ✅ Complete | `mams/mams-server/src/routes/adjustments.routes.ts` · `mams/mams-web/src/pages/Adjustments.tsx` |
| **Reports** — daily / monthly / department / location JSON APIs; **daily CSV** download; print-to-PDF from web | ✅ Complete (CSV currently **daily** tab only) | `mams/mams-server/src/routes/reports.routes.ts` · `mams/mams-web/src/pages/Reports.tsx` |
| **Devices** — list, register, patch, per-device + sync-all (**sync simulates ping**; see TODO in routes) | ✅ Mostly complete | `mams/mams-server/src/routes/devices.routes.ts` · `mams/mams-web/src/pages/Devices.tsx` |
| **Settings** — read + PATCH with audit trail | ✅ Complete | `mams/mams-server/src/routes/settings.routes.ts` · `mams/mams-web/src/pages/Settings.tsx` |
| Audit log infrastructure | ✅ Complete | `mams/mams-server/src/services/audit.service.ts` |
| Sensitive-field masking with audit-logged unmask | ✅ Complete | `mams/mams-server/src/utils/mask.ts` |
| Web shell (Vite + React + Tailwind) — all main nav pages wired | ✅ Complete | `mams/mams-web/src/pages/*.tsx` |
| Seed script (1,800 employees, 7 days of attendance) | ✅ Complete | `mams/mams-server/seed/` |
| eSSL device simulator | ✅ Complete | `mams/scripts/essl-sim.js` |
| Nginx + PM2 ops examples | ✅ Complete | `mams/ops/` |

---

## 5. Remaining work and polish

Core Phase 1 modules in `mams/` are **implemented** (not HTTP 501 stubs). Track these items in the backlog:

| Item | Notes | Spec reference |
|---|---|---|
| **eSSL device sync (pull / ATTLOG)** | `POST /devices/:id/sync` and sync-all currently refresh `lastPingAt` only. Inline **TODO** in `routes/devices.routes.ts`: wire real ADMS DATA QUERY / ATTLOG if the Client needs pull-based reconciliation beyond device push. | SoW §2.6, ADMS cheatsheet |
| **Report CSV parity** | Server exposes **`GET /reports/daily.csv`**. Monthly / department / location tabs are JSON-only; add `.csv` (or query `format=csv`) if the Client requires exports for every report type. | SoW §2.5 |
| **E2E tests (Playwright smoke)** | Not present in repo yet. | dev-scope §10.3 |
| **Letterhead PDF + Indian-format date standardisation on exports** | **Phase 2 — do not build in Phase 1** | SoW §3 |

**Codebase grep (app packages only):** the only `TODO` under `mams/mams-server/src` is in `devices.routes.ts` (ADMS sync queue), as of last doc refresh.

---

## 6. Sprint plan (8–10 weeks)

The contractual milestones from the legal SoW v2 (`final-docs/v2/02_Statement_of_Work.pdf` Clause 5):

| Milestone | Trigger | When | Engineering work to land |
|---|---|---|---|
| **M1** Kickoff | Signed docs received | Week 1 | Onboard team, environment validation, eSSL device compatibility check |
| **M2** Device Connection Verified | One eSSL pushing live in dev | End of Week 4 | Seed → CSV import → Auth hardened → eSSL receiver running with real device → live attendance log working |
| **M3** Build Complete & QA Passed | All Phase 1 modules built | End of Week 7 | Adjustments workflow (incl. approval + audit) → Reports (view + plain PDF + CSV) → Devices admin → Settings editor → internal QA report |
| **M4** UAT Passed & Errors Fixed | Surendranagar UAT complete | End of Week 9 | UAT cycle at HQ → Sev-1/Sev-2 defects closed → eSSL devices live across all 5 locations |
| **M5** Final Handover & Sign-off | On-prem deploy + handover | End of Week 10 | Deploy to Makson on-prem server → User Manual + Admin Setup Guide → training session → source code + credentials handover → Makson written sign-off |

**Suggested sprint cadence:** 2-week sprints. Demo-to-Client cadence: weekly status email + bi-weekly review call (per SoW §9).

---

## 7. House rules (non-negotiable, from CLAUDE.md §12)

These are the rules the design and contracts depend on. Do not deviate without checking with the project lead.

1. **Never reintroduce Phase 2 features into Phase 1.** Reports stay view-only with plain PDF / CSV. No letterhead PDF. No date-format standardisation. No payroll. No leave management. Aadhaar field validation is Phase 2; capture is Phase 1 (masked).
2. **Hours are source of truth.** Never let a day-based calc sneak in. Always compute hours first, derive days last using the standard divisor of 9.5.
3. **Dual view at the query layer, not the table layer.** ONE attendance collection. The `viewMode` tag on the request determines which fields the API returns. No duplication of attendance records.
4. **Smart Anchor MUST be deterministic.** Same `(employeeId, date, alternateShift, realEntry, realExit)` always produces the same `(compliantEntry, compliantExit)`. The seed is `hashString(employeeId + ':' + date)` using the Park-Miller PRNG. Tests guard this.
5. **Timezone:** Asia/Kolkata everywhere. Store UTC, display IST. Use `date-fns-tz`.
6. **Validate PAN + IFSC.** Skip Aadhaar checksum validation in Phase 1.
7. **Audit log is immutable.** Adjustments create new records, never mutate. The MongoDB application user has insert+find permissions only on `attendance_raw`, `adjustments`, `audit_log`, and `unmask_audit`.
8. **Sensitive fields masked by default**, role-gated unmask, every unmask logged in `unmask_audit`.
9. **On-prem only.** No cloud services at runtime. No Auth0, no Sentry, no S3, no Mixpanel, no SaaS auth, nothing. The entire production runtime has zero outbound dependencies.
10. **Run validation gates before every commit:** `npm run validate` (typecheck + lint + tests).

---

## 8. Open questions for the project lead

These need answers before or during Week 1. Track in your sprint backlog.

| # | Question | Why it matters |
|---|---|---|
| 1 | Confirmed list of factory locations + employee counts per location | Sizing the eSSL device count for M2 |
| 2 | Brand assets (Makson logo, favicon) — when will Client deliver? | Per SoW §12, Week 2. Block on this for the deployment-time branding. |
| 3 | Replacement plan for non-eSSL legacy devices (Hanvon F710) | Per SoW §12, Client cost. Need timeline from Komal. |
| 4 | Internet/network reachability between factory locations and the on-prem server | Critical for ADMS push. If a location can't reach the server, eSSL devices buffer up to ~100K records but eventually overflow. |
| 5 | Static IP / DNS for the on-prem server | Devices need a stable target. Self-signed cert fallback if Let's Encrypt is unavailable. |
| 6 | Approval / definition of compliance shifts | The SAD assumes A=06-14, B=14-22, C=22-06 IST. Confirm with Komal. |
| 7 | UAT participants and schedule | Per M4, UAT runs at Surendranagar HQ. Need 3-5 HR users available. |

---

## 9. Communication & escalation

| Role | Person | Contact |
|---|---|---|
| Project Lead / Infoloop SPOC | **Mr. Nimit Kaneria** | `Nimit.Kaneria@infoloop.co` · `+91 97261 81000` |
| Executive Sponsor (Infoloop) | Mr. Nimit Kaneria (CEO) | as above |
| **Tech Lead (Infoloop)** | **Mr. Prem Mehta** | introduced via Project Lead |
| Client SPOC | Mrs. Komal Makasana (CFO & Partner) | introduced via Project Lead |
| Client Executive Sponsor | Mr. Kalpesh Makasana (Director) | introduced via Project Lead |

**Escalation path:** Engineer → **Prem Mehta (Tech Lead)** → **Nimit Kaneria (Project Lead)** → Executive Sponsor.

**Tools:**
- **Microsoft Teams** for all team chat. Channels: `#mams-dev`, `#mams-bugs`, `#mams-deploy` (or whatever Prem sets up — confirm channel names on Day 1).
- **Asana** for sprint backlog and ticket tracking.
- **Email** to the Client only via Project Lead (engineers never email Komal directly without Nimit's awareness).

**Cadence:**
- Daily async standup in Teams `#mams-dev` (15 min, 9:30 AM IST, threaded).
- Weekly status email to Komal (Project Lead writes — engineers contribute one-liners).
- Bi-weekly Client review call (Project Lead + Tech Lead attend; engineers may be invited for technical demos).
- Engineers should never email or message the Client directly without Project Lead's awareness.

---

## 10. Pre-kickoff checklist

Things to do **before writing your first line of MAMS code** on Wednesday 29 April:

- [ ] Read all four documents in §2 reading order
- [ ] Working local environment (per Quick Start §3); seeded DB; both dev servers up; you can log in as both `hr.admin` and `hr.compliance`
- [ ] **Initialise the Git repo from this ZIP** — `git init`, add a `.gitignore`-respecting initial commit, push to the Infoloop Git host, configure branch protection on `main`. The ZIP is delivered without `.git`; the team owns the initial commit.
- [ ] Confirmed access to **Microsoft Teams** channels (`#mams-dev`, `#mams-bugs`, `#mams-deploy` — Prem will confirm names)
- [ ] Confirmed access to the **Asana** project / workspace
- [ ] You can run `npm run validate` and it passes
- [ ] You have read the approved mockup at https://makson-payroll-mockup.netlify.app and clicked through every screen
- [ ] You have skim-read the legal SoW v2 (`final-docs/v2/02_Statement_of_Work.pdf`) — at minimum Clauses 2 (deliverables), 3 (out-of-scope), 5 (milestones), 6 (acceptance), 7 (change management), 8 (SLA), 11 (data ownership)

---

## 11. Day 1 task ideas (low-risk wins to learn the codebase)

Small things to ship on Day 1 that get you into the flow:

1. **Add a CSV employee-import endpoint stub** (`POST /api/employees/import-csv`) that returns a 501. Wire up a corresponding "Import CSV" button on the Employees page that opens a file dialog. No business logic yet.
2. **Add a `/health` ping in the web header** that calls `GET /api/health` every 30s and shows a green/red dot. Good way to see how state + polling work in the existing scaffold.
3. **Write one Vitest unit test** for the masking helper at `mams/mams-server/src/utils/mask.ts`. The tests folder already exists with the Smart Anchor suite as a template.
4. **Read the sidebar component** at `mams/mams-web/src/components/Sidebar.tsx` and add a small "Build version" footer using `import.meta.env.VITE_APP_VERSION` (set it in `.env`).

Pick one. Open a PR. Get it reviewed and merged. Then the real work starts.

---

## 12. Reference: file map of the entire handoff

```
mams-handoff/
├── CLAUDE.md                          # ← read FIRST
├── DEVELOPER-HANDOFF.md               # ← this doc
├── README.md                          # original setup notes
├── HANDOFF-PROMPT.md                  # earlier prompt for Claude Code (skip)
│
├── docs/
│   ├── development-scope.md/.docx/.pdf    # team-facing functional scope
│   └── tech/
│       ├── 01_System_Architecture_Document.docx/.pdf
│       ├── 02_Database_Schema_Reference.docx/.pdf
│       ├── 03_eSSL_ADMS_Protocol_Cheatsheet.docx/.pdf
│       └── 04_Local_Dev_Setup_Guide.docx/.pdf
│
├── mockup/
│   ├── index.html                     # original 1,797-line HTML mockup
│   ├── _redirects, netlify.toml       # hosting config
│
├── mockup-vite/                       # Vite + React port of the mockup
│   ├── package.json, vite.config.ts, tsconfig.json
│   ├── src/main.tsx, src/App.tsx, src/styles/mockup.css
│   └── README.md
│
├── mams/                              # ← THE PRODUCTION CODEBASE
│   ├── README.md                      # quick start
│   ├── package.json                   # workspace root
│   ├── tsconfig.base.json
│   ├── shared/types/                  # Zod schemas, single source of truth
│   ├── mams-server/
│   │   ├── src/                       # Express + Mongoose API + Smart Anchor v2
│   │   ├── seed/                      # seed script
│   │   ├── tests/                     # Smart Anchor unit tests (12 passing)
│   │   ├── package.json, tsconfig.json, vitest.config.ts
│   │   └── .env.example
│   ├── mams-web/
│   │   ├── src/                       # Vite + React + TS + Tailwind frontend
│   │   ├── index.html
│   │   ├── package.json, vite.config.ts, tailwind.config.ts
│   │   └── .env.example
│   ├── scripts/
│   │   └── essl-sim.js                # eSSL device simulator
│   └── ops/
│       ├── nginx/mams.conf.example
│       └── pm2/ecosystem.config.cjs
│
├── final-docs/v2/                     # signed legal docs (reference)
│   ├── 01_Master_Services_Agreement.docx/.pdf
│   ├── 02_Statement_of_Work.docx/.pdf
│   ├── 03_Mutual_NDA.docx/.pdf
│   └── 05_Data_Processing_Agreement.docx/.pdf
│
├── tech-docs/                         # source for the .docx tech docs
│   ├── _shared.js, 01_sad.js, 02_db_schema.js, 03_essl_adms.js, 04_setup_guide.js
│   └── assets/logo_full.png
│
├── legal-docs/                        # source for the .docx legal docs
│   ├── _shared.js, 01_msa.js, 02_sow.js, 03_nda.js, 04_invoice.js, 05_dpa.js
│   └── assets/logo_full.png
│
└── .claude/launch.json                # pre-configured dev server launchers
```

---

## 13. Closing note

The scaffold is intentionally not 100% complete. It is **a foundation that proves end-to-end correctness** for the hardest parts (auth, dual-credential view, eSSL receiver, Smart Anchor v2, sensitive-field masking) and leaves the workflow-heavy modules (Adjustments, Reports, Devices admin, Settings) for the team to build out. This is by design: those modules are where the business value compounds and where the team's domain understanding will be sharpened.

Read carefully. Run the scaffold. Click through the mockup. Then write code.

Welcome aboard.

— **Nimit Kaneria**, Designated Partner & CEO, Infoloop Technologies LLP
