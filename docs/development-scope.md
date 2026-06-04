# MAMS - Development Scope of Work (Internal)

**Project:** Makson Attendance Management System (MAMS)
**Client:** Makson Pharmaceuticals (India) Pvt. Ltd. - Surendranagar, Gujarat
**Owner:** Infoloop Technologies LLP - Surat
**Project Lead:** Nimit Kaneria (CEO, SPOC for Client)
**Document Status:** Internal - for development team only. Do not share with Client.
**Document Version:** v1 · 30 April 2026
**Kickoff Date:** Wednesday, 29 April 2026
**Target Handover:** Week of 24 June 2026 (8–10 weeks)

---

## 1. What we are building

A custom attendance management platform for a 1,800-employee pharmaceutical manufacturer with six factory locations across Gujarat, Madhya Pradesh, Telangana, and Maharashtra. The platform replaces a manual attendance + compliance-reporting workflow.

The headline architectural concept is **dual-credential parallel views over a single source of truth**:

- One operator logs in and sees real attendance data (12-hour shifts as actually worked).
- A different operator logs in and sees the same data transformed into the labour-law-compliant 8-hour shift representation.
- Both views share one underlying database; the differentiation is a query-layer concern, not a duplication of records.
- The transformation from real → compliant timestamps is deterministic and reproducible (Smart Anchor v2 engine).

This is the platform's commercial differentiator. Get this layer right.

---

## 2. Tech stack (non-negotiable)

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| State | React Query (server state) + Zustand (client state) |
| Backend | Node.js 20 + Express.js + TypeScript |
| Database | MongoDB 7 + Mongoose |
| Auth | JWT (HS256), bcrypt for password hashing, refresh-token rotation |
| Process manager | PM2 |
| Reverse proxy | Nginx |
| OS | Linux (Ubuntu 22.04 LTS, configured by Client) |
| Time / dates | `date-fns-tz` - store UTC, display IST (`Asia/Kolkata`) |
| Validation | `zod` on both backend and frontend |
| Testing | Vitest (unit) + Supertest (API) + Playwright (E2E, smoke only) |
| Lint / format | ESLint + Prettier + TypeScript strict mode |
| Repo | Monorepo: `mams-server/` + `mams-web/` + `shared/types/` |

### What we are NOT using

No cloud services, no SaaS, no third-party auth providers (no Auth0, no Firebase), no S3, no Cloudinary, no SMS/email gateways, no analytics SDKs. The system runs entirely on Client's on-premise server with no outbound dependencies in the production runtime.

---

## 3. Deployment target

- Single Linux server provided and administered by Client.
- Specs (Client-provided): minimum 8 GB RAM, 250 GB SSD, static IP, automated backup.
- Deployment workflow: Git → manual SSH deploy → PM2 reload → Nginx upstream switch.
- Database: single MongoDB instance, daily snapshot backups (Client-managed cron).
- No cloud, no Docker required (Docker optional if it simplifies team's local dev).

---

## 4. Modules - functional scope

### 4.1 Authentication & Access

- Two seed users at deployment: `hr.admin@makson-group.com` (real view) and `hr.compliance@makson-group.com` (compliance view).
- Both creds open the same UI shell. The role tag flips a `viewMode` boolean on every authenticated request.
- Password policy: ≥10 chars, mixed case, one digit, one symbol.
- Session: JWT access token (15 min) + refresh token (7 days, rotated).
- Lockout: 5 failed attempts → 15-min lockout.
- Audit log: every login, every failed attempt, every role-elevation, every sensitive-field unmask.

### 4.2 Employee Master

- Full CRUD with form validation.
- Fields: ID, name, gender, department, designation, location, time shift (Day/Night, 12-hour), alternate time shift (A/B/C, 8-hour compliance), weekly off (multi-day array), join date, biometric ID, PAN, **Aadhaar**, bank account number, IFSC, account holder name, account type, bank name, PF number, ESI number, status (Active/Inactive).
- **Field validation:** PAN (regex), IFSC (regex). **No Aadhaar checksum validation in Phase 1** - store typed value as-is.
- **Sensitive-field masking** (see §5.2 for full spec): Aadhaar, PAN, bank account, PF, ESI all masked by default.
- **CSV bulk import:** publish a template CSV on the Settings page; HR uploads filled CSV; backend parses, validates against template format, returns an import report. Source data discrepancies are reported, not silently fixed.
- Search, filter, sort, pagination - server-side for >100 records.

### 4.3 Attendance Capture

- **eSSL device integration via Push Data Technology (ADMS protocol).** Test device: SilkBio-101TC, SN TFDB244600829, IP 192.168.0.240. Other eSSL models nominated by Client must be validated in Week 1–2.
- Devices push punch records to a webhook endpoint (`POST /api/attendance/push`).
- Each punch record stored verbatim - **never deleted, edited, or overwritten by anyone, ever**. This is non-negotiable. See §5.3.
- Smart Anchor v2 derives the compliant punch from the raw punch. See §6.
- Hours decomposition computed per day per employee:
  - `realGrossHours` = exit − entry
  - `breakMinutes` = 30 (default; configurable per shift)
  - `realNetHours` = realGrossHours − (breakMinutes / 60)
  - `compliantHours` = min(realNetHours, 9.5)
  - `otHours` = max(0, realNetHours − 9.5)
  - `dayType` = `Working` | `Weekly Off` | `Absent`
- Live attendance log dashboard: server-sent events or polling (5-sec interval) for real-time feel.

### 4.4 Adjustments

- HR-initiated correction workflow.
- Mandatory fields on every adjustment: employee, date(s), reason, justification (free text), supporting evidence (file URL or document reference), salary impact note.
- Approval workflow: pending → approved/rejected. Single approve, bulk approve, bulk reject.
- **No auto-approval. No deemed approval. No time-elapsed approval.** Every approval is an explicit user action.
- **Immutable audit trail:** every adjustment creates a new record capturing: employeeId, date, fieldChanged, previousValue, newValue, reason, justification, evidenceRef, salaryImpactNote, initiatedBy, initiatedAt, initiatedFromIp, approvedBy, approvedAt, approvedFromIp. Original record remains untouched and viewable alongside the correction.

### 4.5 Reports

- Four reports: Daily, Monthly, Department-wise, Location-wise.
- All views: filter by date range, department, location; sort, paginate.
- **Plain PDF export:** browser-rendered print-to-PDF (no enterprise letterhead - that's Phase 2). Use `window.print()` with print-friendly CSS.
- **CSV export:** server-generated, streamed to client.
- The report data must respect the requesting user's `viewMode` - i.e., the compliance auditor sees compliant hours, the HR admin sees real hours.

### 4.6 Devices

- Registry of all physical biometric units.
- Online/offline status (last-ping timestamp; offline if >5 minutes since last push).
- Per-device sync controls. Global "Sync All" button.
- Visual indicator when a device is offline.

### 4.7 Settings

- Compliance info: CIN, GSTIN, PF, ESI, Factory Licence (free-text fields, no validation beyond format).
- Company-wide weekly off default (overridable per employee).
- Time shifts configuration (Day, Night) and compliance shifts (A, B, C).
- Smart Anchor toggle (default on; off → compliance view shows real timestamps).
- User management: add/edit users, role assignment.
- Confidentiality notice toggle and free-text editor.

### 4.8 Documentation deliverables

These are deliverables, not optional. Owned by tech lead.

- User Manual (HR Admin, Compliance Auditor) - 30–40 page PDF with screenshots.
- Admin Setup Guide - 15–20 page PDF: server setup, install, env vars, backup, recovery.
- System Architecture Document (SAD) - 20–25 page PDF: ER diagram, module map, API surface, deployment topology.
- Inline source-code documentation: TSDoc on every exported function, README in every package.

---

## 5. Non-functional requirements

### 5.1 Timezone

All timestamps stored as UTC ISO strings in MongoDB. All UI display in `Asia/Kolkata`. Use `date-fns-tz` everywhere - never raw `Date.toLocaleString()`.

### 5.2 Sensitive-field masking

Five fields are sensitive: **Aadhaar, PAN, bank account number, PF number, ESI number**. All five must:

1. Be **masked by default** in every UI view that renders them. Masking pattern: show last 4 characters, mask the rest with `X` (e.g., `XXXX-XXXX-1234`). Aadhaar and bank account: show last 4 only.
2. Be **unmaskable only by an explicit user action** (eye-icon click, "View" button, etc.) - never automatic.
3. Be **gated by role permission** - only roles with the `unmask:sensitive` permission may unmask. Default roles: `hr.admin` has it; `hr.compliance` does not.
4. Every unmask action must create an audit-log entry: `{ userId, timestamp, ipAddress, employeeId, fieldName }`. Log is immutable.
5. CSV exports of reports do **not** unmask any sensitive fields by default. A separate "Export with sensitive fields" action exists for `hr.admin` only and is itself audit-logged.

### 5.3 Immutability of biometric records

Raw punch records pushed by eSSL devices are **append-only**. The DB schema has no UPDATE or DELETE permissions for the application user on the `attendance_raw` collection. All business-logic transformations (Smart Anchor output, hours decomposition, day type) live in derived collections that reference the raw record by ID.

This is enforced at three layers:
1. MongoDB role: app user has only `insert` + `find` on `attendance_raw`.
2. Mongoose schema: `pre('updateOne')`, `pre('deleteOne')`, `pre('findOneAndUpdate')` hooks throw on `attendance_raw`.
3. API routes: there is no `PATCH /api/attendance/raw/:id` or `DELETE /api/attendance/raw/:id`. Period.

### 5.4 Dual-view enforcement

There is **one** attendance collection. The query layer determines which fields are returned based on the requesting user's `viewMode`:

- `viewMode: "real"` → returns `realGrossHours`, `realNetHours`, original entry/exit times.
- `viewMode: "compliant"` → returns `compliantHours`, Smart-Anchor-derived entry/exit times that fall within the assigned 8-hour window.

Do **not** create two parallel tables. Do **not** duplicate records. The mockup's structure (one record with both `realHrs` and `compHrs` fields) is the right model.

### 5.5 Smart Anchor determinism

The Smart Anchor v2 engine must be deterministic. Same inputs → same outputs, every time, forever. Seed the PRNG with a hash of `employeeId + YYYY-MM-DD`. Use Park-Miller (Lehmer) LCG with multiplier 16807, modulus 2³¹−1 - this is what the mockup uses (`sr()` function in [mockup/index.html:376](../mockup/index.html#L376)) and we want consistency.

Unit tests must verify:
- Same `(employeeId, date, realPunch)` produces same compliant punch on every invocation.
- Output always falls within the assigned compliance shift window (A: 06:00–14:00; B: 14:00–22:00; C: 22:00–06:00).
- Midnight rollover handled correctly for night-shift workers.
- Weekly-off days return null (no compliant punch generated).

### 5.6 Audit logging

Every action that changes data, every login, every sensitive-field unmask, every settings change creates an audit-log entry. The audit log is its own collection, append-only, indexed on `(userId, timestamp)` and `(entity, entityId)`.

### 5.7 Performance targets

- Initial page load: <2 s on 4G.
- API median response: <300 ms; p95 <800 ms.
- Live attendance log: updates within 5 s of device push.
- CSV export of 10K rows: <10 s.
- Concurrent users supported: 50 (HR + compliance + IT admin).

### 5.8 Browser support

Latest 2 versions of Chrome, Edge, Firefox, Safari. No IE11. Mobile responsive design - works on tablet and mobile, but the HR workflows are desktop-first.

---

## 6. Smart Anchor v2 - algorithm spec

Pseudocode:

```
function smartAnchor(employeeId, date, realEntry, realExit, alternateShift):
    if realEntry is null or realExit is null:
        return { compliantEntry: null, compliantExit: null }
    
    seed = hash(employeeId + dateAsYYYYMMDD)
    rand = createLehmerPRNG(seed)
    
    window = getShiftWindow(alternateShift)  // e.g., A => [06:00, 14:00]
    
    // Pick a compliant entry within the first 30 min of the window
    entryOffsetMin = floor(rand() * 30)  // 0..29 min
    compliantEntry = window.start + entryOffsetMin minutes
    
    // Compliant shift is exactly 8 hours
    compliantExit = compliantEntry + 8 hours
    
    return { compliantEntry, compliantExit }
```

Key invariants the engine must preserve:
- Determinism (same inputs → same outputs).
- Output entry within first 30 min of assigned compliance window.
- Output exit exactly 8 hours after entry.
- Night-shift (Shift C) handled correctly across midnight boundary.
- If the real punch falls inside the compliance window already (rare but possible), Smart Anchor should still emit a compliant entry - not just pass through the real punch (the dual-credential premise requires two distinct timestamps).

---

## 7. Out of scope (Phase 2 - do not build)

| Feature | Why deferred |
|---|---|
| Payroll calculation, salary processing, disbursement | Phase 2 module |
| PF / ESI / PT statutory return generation | Phase 2 module |
| TDS, Form 16 | Phase 2 module |
| Leave management (CL/SL/PL balances, leave application) | Phase 2 module |
| Mobile native apps (iOS/Android) | Web responsive only in Phase 1 |
| Third-party integrations (HRMS, ERP, accounting) | Out of scope |
| Historical attendance data migration | Out of scope (employee master CSV is in scope) |
| SMS/WhatsApp/email notifications | Phase 2 |
| Multi-language UI | English only in Phase 1 |
| Cloud hosting | On-prem only |
| **Aadhaar format/checksum validation** | Phase 2 (capture is in scope, validation is not) |
| **Enterprise letterhead PDF** with full compliance header | Phase 2 (plain PDF is in scope) |
| **Indian-format date standardisation across exports** | Phase 2 (in-app DD/MM/YYYY is in scope) |
| **In-app brand asset upload** | Phase 2 (deploy-time configuration is in scope) |

If anyone on the team finds themselves adding code for any of the above, stop - that's scope creep. Flag it to the tech lead.

---

## 8. Delivery milestones (internal)

These are **delivery checkpoints** - what we demonstrate to the Client at each stage. They are not payment milestones from the team's perspective; do not anchor estimates to anything other than effort.

| # | Milestone | Trigger | Demo target |
|---|---|---|---|
| M1 | Kickoff complete | Repo set up, environments provisioned, team onboarded, Day 1 checklist done | Internal - tech lead reviews repo + env |
| M2 | Device connection verified | One eSSL device in Surendranagar HQ pushing live punches into MAMS dev environment | Demo to Client at Surendranagar; written acceptance required from Client |
| M3 | Build complete & internal QA passed | All Phase 1 modules built; Smart Anchor v2 unit tests passing; full internal QA cycle complete; bug list documented | Demo to Client; written acceptance required |
| M4 | UAT passed & errors fixed | UAT cycle at Surendranagar complete; all P1/P2 bugs closed; eSSL devices live across all 5 operational locations | Client UAT sign-off in writing |
| M5 | Final handover | Deployment on Client server complete; training delivered; full source code + DB admin creds + app admin creds + env files + deploy scripts handed over | Final written sign-off |

**Important:** every milestone after M1 requires *explicit written acceptance* from Client. There is no auto-acceptance, no deemed acceptance, no 5-day timer. If Client review is delayed beyond 10 business days, Nimit handles escalation - team continues working on next module.

---

## 9. Sprint plan (8 weeks of build, 2 weeks of UAT/handover)

| Week | Sprint focus | Owner |
|---|---|---|
| 1 (29 Apr – 3 May) | Repo scaffold (mams-server + mams-web monorepo), CI setup, MongoDB schema design, eSSL device validation, requirements freeze | Tech lead + 1 dev |
| 2 (4 May – 10 May) | Auth module + dual-credential routing + JWT + audit-log skeleton + first eSSL push integration in dev env | Tech lead + 1 dev |
| 3 (11 May – 17 May) | Employee Master (CRUD + form validation + masking + CSV import utility) | 2 devs |
| 4 (18 May – 24 May) | Attendance Capture module + Smart Anchor v2 engine + hours decomposition + unit tests | Tech lead + 1 dev. **M2 demo at end of week.** |
| 5 (25 May – 31 May) | Adjustments module + approval workflow + immutable audit trail + bulk operations | 1 dev |
| 6 (1 Jun – 7 Jun) | Reports module (4 reports) + plain PDF export + CSV export + Devices module | 2 devs |
| 7 (8 Jun – 14 Jun) | Settings module + sensitive-field masking polish + visual polish + internal QA cycle 1. **M3 demo at end of week.** | All hands |
| 8 (15 Jun – 21 Jun) | UAT at Surendranagar HQ + bug fixes + documentation finalisation. **M4 demo at end of week.** | Tech lead + 1 dev on-site, others on bug-fix |
| 9 (22 Jun – 28 Jun) | Deployment to Client on-prem server + training + handover prep. **M5 demo at end of week.** | Tech lead on-site |
| 10 (29 Jun – 5 Jul, buffer) | Buffer week - handover polish, knowledge transfer, AMC handoff if applicable | All hands available for warranty support |

---

## 10. Definition of Done - applies to every task

A task is not "done" until all of the following are true:

- [ ] Code merged to `main` via pull request with at least one approval.
- [ ] All new code has TypeScript strict-mode types (no `any` without `// eslint-disable-next-line` and a comment explaining why).
- [ ] Unit tests for any new logic; test coverage on the changed file does not regress.
- [ ] Linter passes; Prettier formatted; no `console.log` left in production code.
- [ ] If the task touches an API: request + response shape documented in shared/types.
- [ ] If the task touches a sensitive-field path or audit trail: explicit audit-log entry verified by a test.
- [ ] If the task touches the on-prem deployment: deployment runbook updated.
- [ ] If the task changes user-visible behaviour: User Manual updated (or ticket created if doc lag is intentional).

---

## 11. Repository, branching, CI

```
mams/
├── mams-server/          # Express + Mongoose + TS
├── mams-web/             # Vite + React + TS + Tailwind
├── shared/types/         # Zod schemas + inferred TS types - single source of truth
├── ops/
│   ├── nginx.conf
│   ├── pm2.ecosystem.json
│   └── deploy.sh
├── docs/                 # User Manual, Admin Guide, SAD (markdown source)
└── .github/workflows/
    └── ci.yml            # lint + typecheck + test on every PR
```

- **Branching:** `main` is always deployable. Feature branches off `main`, named `feat/<module>-<short-desc>`. Bugfix branches `fix/<short-desc>`. PRs require one reviewer + green CI.
- **Commit messages:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
- **No force-push to `main`. No skipping CI.**
- **Pre-commit hook:** runs lint + typecheck + smoke unit tests locally.

---

## 12. Compliance & audit obligations

These are not optional. Build them in from day one.

- **DPDP Act 2023 alignment:** lawful basis (employer-employee), data-minimisation (masking), purpose limitation (no use of Client data for any non-Makson purpose ever - no demos, no training datasets, nothing), 72-hour breach notification path documented, data subject rights (access, correction, erasure-on-leave) exposed via API.
- **SPDI Rules 2011:** TLS 1.2+ in transit; encryption at rest at the volume level (Client's responsibility on on-prem server) and at the field level for the five sensitive fields.
- **No personal data leaves the Client server.** No analytics SDKs, no error reporting (Sentry, Bugsnag, etc.), no cloud logging. Logs go to local files, rotated by logrotate.
- **Audit log completeness** is reviewed in the M3 internal QA cycle as a release blocker.
- **Engagement is strictly limited to Makson Pharmaceuticals (India) Pvt. Ltd.** as a single legal entity. No data from any group/sister/affiliate company. If Client asks about extending coverage to another entity, escalate to Nimit - separate engagement required.

---

## 13. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| eSSL device on a model we haven't tested fails compatibility | Medium | High | Validate every nominated model in Week 1–2. Maintain compatibility matrix. Escalate to Nimit if a model fails. |
| Client server provisioning delayed | Medium | High | Local Docker dev environment in Week 1; can demo from dev box if Client server slips. Push Client weekly via Nimit. |
| Smart Anchor edge case (DST? leap second?) | Low | Medium | India does not observe DST. Use Asia/Kolkata throughout. Test midnight rollover and year-boundary cases explicitly. |
| Audit log volume blows up disk | Low | Medium | Log rotation: monthly partitions; archive old logs to cold storage on Client server. |
| Dev team accidentally adds a Phase 2 feature | Medium | Medium | This SoW + tech lead PR review. If anyone is unsure, ask. |
| Sensitive-field masking forgotten on a new view | Medium | High | Centralise masking in a `<MaskedField>` component. Lint rule: any field name matching `aadhaar|pan|bankAccount|pfNumber|esiNumber` rendered without `<MaskedField>` fails CI. |
| MongoDB on-prem performance issue | Low | Medium | Index review at end of Sprint 4. Load test with 10K rows + 50 concurrent users in Sprint 6. |
| UAT throws up a major change request | Medium | High | Strict change control - any Client request not in this SoW goes through Nimit, who decides Phase 1 vs Change Request vs Phase 2. |

---

## 14. Team roles

| Role | Responsibility |
|---|---|
| **Tech Lead** (Prem Mehta) | Architecture decisions, PR review, Smart Anchor v2 ownership, on-site demos at Surendranagar (M2, M4, M5), handover prep |
| **Senior Full-stack Dev (×1)** | Auth, Employee Master, Adjustments - the backend-heavy modules |
| **Mid Full-stack Dev (×1)** | Reports, Devices, Settings - the frontend-heavy modules |
| **Junior Full-stack Dev (×1)** | CSV import, audit log UI, helper utilities - pair with senior |
| **QA / Tester** | UAT cycles, regression testing, sensitive-field masking verification, bug triage |
| **DevOps (part-time)** | On-prem server bootstrap, Nginx config, PM2 setup, deployment runbook |
| **Project Lead (Nimit)** | Client SPOC, requirements clarification, milestone sign-off coordination, escalation point |

---

## 15. Communication

- **Daily standup:** 15 min, 9:30 AM IST, async-friendly (Teams thread acceptable for distributed days).
- **Sprint review:** end of each week (Friday 5 PM), 30 min, demo + retro.
- **Tech-lead 1:1 with Nimit:** Mon + Thu, 30 min, status + risks.
- **Client comms:** Nimit only. No team member emails Client directly. If Client emails a team member, forward to Nimit immediately.
- **Microsoft Teams channels:** `#mams-dev`, `#mams-bugs`, `#mams-deploy`.
- **Asana** for sprint backlog and tickets.

---

## 16. What "good" looks like at handover (M5)

- Client can log in as both `hr.admin` and `hr.compliance` and see their respective views.
- Real eSSL devices at all 5 active factory locations are pushing punches into MAMS in real time.
- HR can run any of the 4 reports for any date range and export to PDF/CSV.
- HR can correct attendance via the Adjustments module with full audit trail.
- All sensitive fields are masked; only `hr.admin` can unmask, with audit log entries for every unmask.
- The Client's IT admin has been trained on the Admin Setup Guide and can restart, redeploy, and restore from backup.
- All source code, credentials, and runbooks have been transferred. The Client controls the system end-to-end.
- We are home before week 11 with a clean handover.

---

**Questions on this scope go to Nimit. Do not raise them with the Client directly.**
