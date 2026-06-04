# MAMS — Makson Attendance Management System

> **Read this fully before writing any code.** It encodes the project's compliance constraints and design rules. AI tools (Cursor, GitHub Copilot, CodeRabbit) read this as project-level context and steer code generation accordingly. Mismatched generations against these rules will be rejected at PR review.

## Project context
- **Client:** Makson Pharmaceuticals (India) Pvt. Ltd. (only — not subsidiaries)
- **Provider:** Infoloop Technologies LLP
- **Lead Developer:** Prem P Mehta — Director of Project & Solutions Delivery
- **PM:** Nimit Kaneria — CEO
- **Phase 1 timeline:** 9 weeks effective (29 Apr → 10 Jul 2026; Prem on leave 30 Apr–7 May)
- **Stack:** MERN — MongoDB 7, Express + Mongoose + TypeScript, React + Vite + TypeScript, Node 22 LTS
- **Deployment:** Makson on-prem server (no cloud at runtime)
- **Internal comms:** Microsoft Teams
- **Working hours:** Mon–Fri, 10h/day, IST

## Compliance constraints — non-negotiable

These are not preferences. They are contractual obligations to the client and the basis for the audit trail Komal Makasana (CFO & Partner) will inspect at every milestone.

### 1. Hours are source of truth, not days
- Standard divisor: **9.5 hrs/day**
- `equivalentDays = compliantHours / 9.5` (computed at query time, never stored)
- Day-based math is for output only; never let day-based logic drive a calculation

### 2. Original biometric records are immutable
- Raw timestamps from devices are NEVER deleted, edited, or overwritten
- Mongoose schemas for `RawPunch` and `Attendance` MUST NOT expose `updateOne`, `deleteOne`, `findOneAndUpdate`, `findOneAndDelete`
- Corrections create new `AttendanceCorrection` records that REFERENCE (do not mutate) the original

### 3. Sensitive fields masked by default
Sensitive fields: `aadhaar`, `pan`, `bankAccount`, `ifsc`, `pfNumber`, `esiNumber`

- **Mask format:** keep last 4 chars, replace rest with `X` (e.g., `XXXXXXXXXXXX1234`)
- **Manual entry only:** Aadhaar and PAN are typed by HR (no OCR, no UIDAI/NSDL API)
- **Aadhaar checksum/format validation deferred to Phase 2**
- **Unmasking** is gated on:
  1. Authorised role per `docs/auth-design.md`
  2. Explicit user action (button click + confirm dialog)
  3. Audit-log entry (`user`, `timestamp`, `ip`, `field`) written **before** plaintext is returned (atomic)
- Property-based test (`fast-check`) required: 1000 random objects → assert no leakage in serialised output

### 4. Smart Anchor v2 must be deterministic
- Same `(employeeId, YYYY-MM-DD, rawPunch)` → **same** `compliantPunch`, **forever**
- Park-Miller LCG (modulus 2³¹–1, multiplier 16807) seeded by hash of `employeeId + ':' + 'YYYY-MM-DD'`
- Property-based tests with `fast-check` are mandatory (1000 pairs, run twice, assert identical)
- Reference: `mockup/index.html` line 376 (`sr()` function in MAMS-handoff repo)
- **Never use `Math.random()`, `Date.now()`, `crypto.randomBytes()`** in this code path

### 5. Dual-credential view at QUERY layer, not table layer
- ONE attendance table
- Auth middleware tags request with `req.user.viewMode: 'real' | 'compliant'`
- Same UI, same endpoints, different payload based on `viewMode`
- Two seed users on first server boot:
  - `hr.admin@makson-group.com` → `viewMode = 'real'`
  - `hr.compliance@makson-group.com` → `viewMode = 'compliant'`

### 6. Timezone is Asia/Kolkata everywhere
- Store UTC, display IST
- Use `date-fns-tz` for ALL conversions
- Date-of-shift logic for night-shift edge cases (a 12:30 AM Tuesday punch may belong to Monday's shift)

### 7. No deemed acceptance
- Every milestone (M2–M5) requires Komal's explicit written sign-off
- No automatic, time-based, or implicit acceptance
- Internal acceptance criteria must be objectively verifiable

### 8. Visual spec is locked AND we have the source code
- Approved mockup: **https://makson-payroll-mockup.netlify.app**
- Source code: `mams-handoff/mockup/index.html` (1797 lines, single-file React+Tailwind+Babel-via-CDN)
- Locked **30 April 2026**
- The frontend (`mams-web`) is **adapted from this mockup**, not built from scratch — Vite+React+TS structure migrates the existing views (Login, Dashboard, Employees, Employee Detail, Attendance Log, Reports, Adjustments, Devices, Settings) and wires them to real backend APIs
- Any deviation from mockup behaviour requires a written Change Request per SoW §7
- Minor refinements (spacing, accessibility, mobile responsiveness) continue as normal delivery
- Specific mockup line references for future use:
  - `sr()` PRNG at line 376 — Park-Miller LCG starting point for Smart Anchor
  - `genAtt()` at lines 429-485 — realistic edge-case patterns (late, absent, weekly off, hours decomposition)
  - `EMPS` array at lines 390-422 — 1800-employee weighted distribution to seed test data
  - `V` validation object at lines 361-375 — regex patterns for PAN, IFSC, etc.

## Coding rules

### Files & structure
- Monorepo packages: `mams-server/`, `mams-web/`, `mams-shared/`
- TypeScript **strict mode** everywhere
- Prefer **editing existing files** over creating new ones
- Don't add features beyond the task acceptance criteria
- Don't add fallbacks, retries, or validation for impossible scenarios — trust framework guarantees
- Don't design for hypothetical future requirements

### Comments
- **Default: write no comments**
- Only write a comment when the *why* is non-obvious (workaround, hidden constraint, surprising behavior)
- Don't write comments that explain WHAT the code does — well-named identifiers do that
- Don't reference task IDs, PR numbers, or issue numbers in comments — those rot

### Tests
- **Compliance-critical paths require property-based tests** (`fast-check`), not just example tests
- Every endpoint touching sensitive data must assert audit-log row was written (`expect(AuditLog.count()).toBe(N + 1)`)
- Smart Anchor: determinism property test (1000 random pairs, run twice, assert identical)
- Masking: 1000 random objects, assert no sensitive-value digit-run in serialised output
- CI runs all tests on every PR; merge blocked unless green

### AI-tool usage notes (Cursor, Copilot, CodeRabbit)
AI tools generate generic Express/React patterns by default. **These patterns will fail review on this project:**

- ❌ `console.log(employee)` / `console.log(attendance)` / `console.log(req.body)` — leaks unmasked PII
- ❌ `Employee.findOneAndUpdate(...)` on biometric paths — violates immutability
- ❌ `Math.random()` / `Date.now()` in Smart Anchor — violates determinism
- ❌ Skipping audit-log middleware for "performance" — violates compliance contract
- ❌ Conditional masking ("only mask in production") — violates mask-by-default

**Always check AI-generated code for these anti-patterns before committing.** CodeRabbit auto-flags PRs touching `attendance/`, `biometric/`, `audit-log/`, `unmask/`, or `smart-anchor` paths for human review — do not auto-approve those.

## Out of scope (Phase 2 — do not build in Phase 1)

Even if AI tools suggest these patterns, they are explicitly out of scope:
- Aadhaar UIDAI checksum / format validation
- Enterprise letterhead PDF (only plain browser print-to-PDF in Phase 1)
- Indian DD/MM/YYYY date standardisation across exports
- In-app brand-asset upload UI (configured at deployment time)
- Payroll calculation, PF/ESI/PT returns, TDS, Form 16
- Leave management module (CL/SL/PL balances, leave application workflow)
- Mobile apps (iOS/Android)
- SMS/WhatsApp/email notifications
- Multi-language UI (English only)
- Cloud hosting (system deployed on Makson on-prem server only)

## Acceptance gates (milestones)

| Gate | Trigger | Target |
|---|---|---|
| M1 | Signed docs + token received | ✅ 30 Apr 2026 (complete) |
| M2 | eSSL device live in dev, demo'd to Komal, written acceptance | 5 Jun 2026 |
| M3 | All modules built + internal QA report + demo + written acceptance | 19 Jun 2026 |
| M4 | UAT passed + all P1/P2 closed + 5-site rollout + written acceptance | 3 Jul 2026 |
| M5 | Production deploy + handover bundle + training + final sign-off | 10 Jul 2026 |

## Reference files
- **Project planning:** Asana project [MAMS — Makson Phase 1](https://app.asana.com/1/1209462166057632/project/1214413615913479)
- **Visual spec:** https://makson-payroll-mockup.netlify.app (locked 30 Apr 2026)
- **Smart Anchor design:** `docs/smart-anchor-v2-design.md` (drafted by Nimit; reviewed by Prem on 11 May)
- **Auth role matrix:** `docs/auth-design.md` (drafted by Prem in S1)
- **Admin setup guide:** `docs/admin-setup.md` (drafted progressively as features ship; finalised in S6)

## Working agreement (PM ↔ Dev)

**Nimit (PM) owns:**
- Client comms (weekly status emails, bi-weekly review calls, milestone acceptance)
- Spec authority — ambiguities flow to Nimit, not the dev
- Compliance-path PR review (audit-log, masking, immutability, Smart Anchor) — CodeRabbit alone is not sufficient for these paths
- Milestone gate decisions
- Asana grooming

**Prem (Dev) owns:**
- All implementation, tests, automated CI
- Sprint kanban grooming
- Weekly demo content (Friday)
- Documentation drafts (User Manual, Admin Setup Guide, SAD)
- Twice-weekly Teams check-ins (Mon + Thu, 30 min)
