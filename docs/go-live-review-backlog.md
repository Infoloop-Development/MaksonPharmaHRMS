# Go-live review backlog (MAMS)

**Purpose:** Items to review, decide, or complete **before** turning on live factory attendance.  
**Status doc only** — not a substitute for the operational runbook.

| Doc | Use when |
|-----|----------|
| [biometric-go-live-runbook.md](./biometric-go-live-runbook.md) | Day-of rollout steps (employees → device enroll → register → pilot punch) |
| [device-compatibility-matrix.md](./device-compatibility-matrix.md) | Vendor endpoints, simulators, staging gates |
| This file | Product/engineering/ops decisions still open |

**Last updated:** June 2026  
**Repo:** https://github.com/PremPMehta/MaksonPharamaHRMS

---

## Already shipped (for context)

- Employee ↔ device mapping via **Biometric ID** (must match device user ID exactly).
- eSSL ADMS + Hanvon push/pull ingestion, append-only raw punches.
- **Devices** page: registration, sync, and monitoring (Pending setup / Waiting for first punch / Live).
- Go-live UI: checklist, **Unmapped punches**, **Go-live readiness** (active employees with no recent punch).
- Employee CSV import (UI + API template).

---

## Must review before production go-live

### Security and secrets

- [ ] Generate new `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (never use dev/seed values in prod).
- [ ] Rotate all Hanvon `pushToken` values from seed defaults (`hanvon-dev-token-change-me`).
- [ ] Confirm `.env` files are **not** in git and are deployed only on the server.
- [ ] TLS/HTTPS on Nginx for `/iclock` and `/integrations/hanvon` (devices often require reachable host:443 or :80).
- [ ] MongoDB: auth enabled, network restricted to app server, encrypted volume per ops SAD.
- [ ] Review whether `final-docs/` and legal DOCX in this repo should remain public on GitHub (consider private repo or `.gitignore` if confidential).

### Infrastructure

- [ ] Production host URL documented for IT (eSSL `https://<host>/iclock/cdata`, Hanvon push URL).
- [ ] Firewall: factory devices → MAMS server only; no inbound from internet unless intended.
- [ ] PM2 + Nginx config from `mams/ops/` applied and smoke-tested.
- [ ] `APP_PUBLIC_URL` in server `.env` matches the URL HR users open in the browser (welcome emails).
- [ ] Backup/restore procedure for MongoDB (attendance_raw is legal record — retention policy with client).

### Data and HR process

- [ ] Agree **biometric ID scheme** with IT (numeric PIN vs `BIO###` — same string on device and in MAMS).
- [ ] Bulk load or verify all active employees have correct `biometricId` before first live punch.
- [ ] Pilot: one employee + one device → Attendance Log row + device **Live** (see runbook Phase 4).
- [ ] Process for fixing **Unmapped punches** (Devices page): update employee Biometric ID → employee re-punches.

### Vendor / hardware validation

- [ ] Confirm real Hanvon pull API path matches `GET {pullBaseUrl}/api/attendance/logs` (adjust adapter if vendor docs differ).
- [ ] Soak test each device model per [device-compatibility-matrix.md](./device-compatibility-matrix.md) (48h pilot site).
- [ ] Orphan rate target: &lt; 1% of punches during pilot (audit `orphan_punch` events).

---

## Product gaps (Phase 1 — review priority, not blocking pilot)

| Item | Notes |
|------|--------|
| **MAMS → device user sync** | No automatic push of employee list to biometric hardware; enrollment stays on vendor tools. Decide if Phase 2 scope. |
| **Adjustments module** | API/page largely stub — confirm if go-live needs manual corrections on day one. |
| **Reports (PDF/CSV)** | Stub — confirm statutory export deadline vs go-live date. |
| **Settings (shifts UI)** | Partial; schema supports PATCH — inline shift edit called out as future sprint in UI. |
| **E2E tests** | Not present — consider Playwright smoke for login + one punch path before wide rollout. |
| **First-punch celebration / alerts** | Optional UX when device transitions to Live (not implemented). |
| **Email (SMTP)** | Welcome email on user create requires `MAIL_ENABLED` + SMTP in prod `.env`. |

---

## Documentation / repo hygiene (low urgency)

- [ ] Update [mams/README.md](../mams/README.md): CSV import is implemented; adjust “TODO” row if still listed as stub.
- [ ] Add production deploy section to root [README.md](../README.md) (clone, env, seed once, build, PM2).
- [ ] Keep this backlog in sync when closing items (check boxes in PRs).

---

## Suggested sign-off before “all locations live”

| Role | Sign-off |
|------|----------|
| HR (Makson) | Employee master + Biometric IDs loaded; pilot punch verified in Attendance Log |
| IT | Devices reach server; serials/tokens match MAMS; enrollment IDs aligned |
| Infoloop / dev | Secrets rotated; HTTPS; backups; Hanvon/eSSL paths validated on real hardware |
| Client SPOC | Reports/adjustments gap accepted or scheduled post go-live |

---

## How to use this doc in git workflow

1. Complete or tick items in PRs tied to go-live.
2. Commit updates to this file when decisions are made (keeps GitHub history of what was reviewed).
3. Do **not** store production passwords or tokens here — reference runbooks and server `.env` only.
