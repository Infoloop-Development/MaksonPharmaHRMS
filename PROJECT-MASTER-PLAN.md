# MAMS — Master Project Plan

**Project:** Makson Attendance Management System Phase 1
**Client:** Makson Pharmaceuticals (India) Pvt. Ltd. (Mrs. Komal Makasana, CFO & Partner)
**Provider:** Infoloop Technologies LLP (Nimit Kaneria, CEO)
**Lead Developer:** Prem P Mehta (Director, Project & Solutions Delivery) — AI tooling: Cursor + GitHub Copilot + CodeRabbit
**Drafted:** 30 April 2026 (post-design-approval)
**Asana:** [MAMS — Makson Phase 1](https://app.asana.com/1/1209462166057632/project/1214413615913479)

---

## 1. Executive Summary

| Aspect | Detail |
|---|---|
| **Total tasks** | 62 (47 module + 15 quality) |
| **Total Prem effort** | 450h across 9 working weeks |
| **Total Nimit effort** | ~50h (PM, comms, milestone management) |
| **Project window** | Wed 29 Apr 2026 → Fri 10 Jul 2026 (10 calendar weeks) |
| **Prem available window** | Mon 11 May → Fri 10 Jul (9 working weeks) |
| **Prem cadence** | Mon-Fri, 10h/day |
| **Milestones** | 5 (M1 complete · M2-M5 pending) |
| **Retainer payments** | 5 instalments tied to milestone written acceptance |
| **Comms** | Microsoft Teams (internal) · Email + Teams (Komal/Kalpesh) |
| **Visual spec** | https://makson-payroll-mockup.netlify.app — locked 30 Apr 2026 |

---

## 2. Cycle Overview (single-pane-of-glass view)

```
WEEK   DATES               SPRINT  THEME                              GATE        % PAYMENT  STATUS
─────────────────────────────────────────────────────────────────────────────────────────────────────
W1     29 Apr–8 May (Wed)  S0      Kickoff + Setup (Prem on leave)    M1 ✅       50%        DONE
W2-3   11 May–22 May       S1      Foundations: Auth + Smart Anchor   —           —          PENDING
                                   + Employee Master + Masking
W4-5   25 May–5 Jun        S2      Capture + Compliance Engine        🎯 M2       15%        PENDING
                                   eSSL + Live Attendance
W6     8 Jun–12 Jun        S3      Adjustments Workflow + Devices     —           —          PENDING
W7     15 Jun–19 Jun       S4      Reports + Quality Pass             🎯 M3       15%        PENDING
W8     22 Jun–26 Jun       S5      Settings + Privacy Officer + QA    —           —          PENDING
W9     29 Jun–3 Jul        S6      UAT + User Manual                  🎯 M4       10%        PENDING
W10    6 Jul–10 Jul        S7      Deploy + Handover + Training       🎯 M5       10%        PENDING
─────────────────────────────────────────────────────────────────────────────────────────────────────
                                                              TOTAL:  100% across 5 retainers
```

---

## 3. Sprint S0 — Kickoff & Setup Week
**Window:** Wed 29 Apr – Fri 8 May 2026 · **Prem:** on Char Dham yatra · **Owner:** Nimit (PM-only week)

### Goals
- Project formally underway (M1 complete)
- Server access and tooling ready for Prem's first day
- Smart Anchor v2 design doc ready for Prem's review on 11 May
- AI-tool guardrails (CLAUDE.md, .cursorrules, coderabbit.yaml) committed to repos before Prem arrives

### Tasks (Nimit, ordered by due date)

| # | Task | Effort | Due | Status |
|---|---|---|---|---|
| 1 | ✅ Reply to Prem's leave email | 0.5h | 30 Apr | **DONE** |
| 2 | ✅ Confirm M1 status (token + signed v2 docs) | 0.5h | 1 May | **DONE** |
| 3 | ✅ Design approved by Makson (mockup locked) | 0h | 30 Apr | **DONE** |
| 4 | Email Makson IT — server creds + device list | 1h | 1 May | Pending |
| 5 | First weekly status email to Komal | 1h | 1 May | Pending |
| 6 | Set up bi-weekly review call cadence | 0.5h | 4 May | Pending |
| 7 | Salary cycle policy with finance (7th–10th) | 1h | 4 May | Pending |
| 8 | Create GitHub org / repos (3 repos with branch protection) | 1h | 4 May | Pending |
| 9 | Add CLAUDE.md, .cursorrules, coderabbit.yaml to repos | 4h | 7 May | Pending |
| 10 | Draft Smart Anchor v2 design doc | 8h | 7 May | Pending |

### 🎯 Milestone M1 — Kickoff (50% retainer)
**Trigger met:** 30 Apr 2026 ✅
**Acceptance:** Signed MSA + SoW + NDA + DPA received from Makson + token payment credited
**Action:** Issue Tax Invoice replacing the Proforma (use legal-docs/04_invoice.js with title='TAX INVOICE', ref='ITL/INV/MAKSON/2026-04-001')

### Risks for S0
- Makson IT slow with server credentials → Prem can't deploy on Day 1 (mitigation: chase by Mon 4 May; if not received, push device work in S1)

---

## 4. Sprint S1 — Foundations
**Window:** Mon 11 May – Fri 22 May 2026 · **Prem:** 100h · **Modules:** Auth · Smart Anchor · Employee Master · Masking & Audit · Infra

### Goals
- Dev environment operational on Makson on-prem server
- Smart Anchor v2 deterministic engine implemented + property-tested
- Dual-credential auth (HR Admin / Compliance Auditor) working
- Employee Master CRUD + masking + audit log live
- All compliance-critical foundations laid

### Tasks (Prem, ordered by start date)

| Day | Task | Module | Priority | Effort |
|---|---|---|---|---|
| Mon 11 May | Review Smart Anchor v2 design doc | Smart Anchor | P1 | 2h |
| Mon-Tue 11-12 May | Stand up MERN dev environment on Makson on-prem server | Infra | P0 | 8h |
| Mon-Wed 11-13 May | Scaffold MERN monorepo (Vite+React+TS, Express+Mongoose+TS) | Infra | P0 | 6h |
| Tue-Wed 12-13 May | Implement seeded PRNG (Park-Miller LCG) | Smart Anchor | P0 | 8h |
| Wed 13 May | GitHub Actions CI (lint, typecheck, test, build) | Infra | P1 | 3h |
| Wed-Thu 13-14 May | Design role matrix (incl. Privacy Officer) | Auth | P0 | 4h |
| Wed 13 – Mon 18 May | Smart Anchor offset rules + edge cases | Smart Anchor | P0 | 16h |
| Thu 14 – Tue 19 May | JWT-based dual-credential auth | Auth | P0 | 12h |
| Mon-Tue 18-19 May | Employee MongoDB schema with masked-field design | Employee Master | P0 | 6h |
| Tue-Wed 19-20 May | Audit-log middleware | Masking & Audit | P0 | 6h |
| Tue-Wed 19-20 May | Mask middleware (centralised) | Masking & Audit | P0 | 6h |
| Tue-Thu 19-21 May | Employee CRUD endpoints (role-gated + audit) | Employee Master | P0 | 12h |
| Wed-Thu 20-21 May | Unmask endpoint with audit log | Masking & Audit | P0 | 5h |
| Thu-Fri 21-22 May | Property-based tests for masking (fast-check) | Masking & Audit | P0 | 6h |

**S1 Demo:** Fri 22 May — Auth + Employee Master + Masking + Smart Anchor PRNG. Internal review with Nimit (no client demo yet).

### Critical path
- **Smart Anchor PRNG (Day 2-3) blocks everything else from Day 4 onward.** If determinism property tests fail, all downstream Smart Anchor work delays.
- **Role matrix (Day 3-4) blocks JWT auth implementation.** Need to settle who can do what before coding the gates.

---

## 5. Sprint S2 — Capture & Compliance Engine → 🎯 M2
**Window:** Mon 25 May – Fri 5 Jun 2026 · **Prem:** 100h · **Modules:** Employee Master · eSSL & Devices · Attendance · Smart Anchor · Docs

### Goals
- Bulk import (CSV+XLSX) for employees + attendance — Komal's specific request
- eSSL device pushing live punches into MAMS dev environment
- Live attendance log dashboard reflecting real captures
- ADRs + architecture diagrams started for SAD deliverable
- **M2 demo on Fri 5 Jun — eSSL device connection verified for Komal's written acceptance**

### Tasks (Prem, ordered by start date)

| Day | Task | Module | Priority | Effort |
|---|---|---|---|---|
| Mon-Tue 25-26 May | Employee bulk import (CSV + XLSX) — published template | Employee Master | P1 | 14h |
| Mon-Tue 25-26 May | eSSL ADMS protocol probe (SilkBio-101TC sample payload + parser) | eSSL & Devices | P0 | 12h |
| Mon-Wed 25-27 May | Employee Master React UI (masked-by-default + unmask UX) | Employee Master | P1 | 16h |
| Wed-Fri 27-29 May | ADRs + architecture diagrams (feeds SAD) | Docs | P1 | 8h |
| Wed-Fri 27-29 May | Live-punch capture endpoint | eSSL & Devices | P0 | 10h |
| Mon-Tue 1-2 Jun | Seed dataset for testing (1800 employees + 30d attendance) | Employee Master | P1 | 8h |
| Mon-Tue 1-2 Jun | Attendance schema with hours decomposition | Attendance | P1 | 6h |
| Wed-Fri 3-5 Jun | Bulk attendance data import (CSV + XLSX) — Komal's request | Attendance | P1 | 12h |
| Wed-Fri 3-5 Jun | Live attendance dashboard (raw punch feed + 4 stat tiles) | Attendance | P1 | 14h |

**S2 Demo:** Fri 5 Jun — **🎯 M2 acceptance call with Komal**. Live demo: eSSL device on factory floor punches → MAMS shows raw punch within 5s + Smart Anchor compliant punch.

### 🎯 Milestone M2 — Device Connection Verified (15% retainer)
**Target:** Fri 5 Jun 2026
**Trigger:** At least one eSSL device at Surendranagar HQ pushing live punches into MAMS dev environment, demonstrated to Komal in a live Teams call, accepted **in writing** by Komal.
**Acceptance process:**
1. Schedule call with Komal Wed 3 Jun (T-2 days) for Fri 5 Jun afternoon
2. Live demo on factory floor + MAMS dev URL screenshare
3. Komal issues written acceptance via email
4. **Generate Tax Invoice for M2 milestone payment**
5. Mark M2 task complete in Asana → Prem moves to S3

### Critical path
- **eSSL probe (Mon 25 May) is the highest-risk Day-1 task.** If device behavior diverges from parser assumptions, surface immediately. Schedule slips only days, not weeks.
- **Live-punch capture (Wed 27 May) depends on eSSL probe.** Sequential dependency.

---

## 6. Sprint S3 — Adjustments Workflow + Devices
**Window:** Mon 8 Jun – Fri 12 Jun 2026 · **Prem:** 50h · **Modules:** Adjustments · eSSL & Devices

### Goals
- Adjustments workflow (Komal's point #6) with immutable audit trail
- Adjustment immutability property-tested
- Device registry with online/offline monitoring + sync controls

### Tasks (Prem, ordered by start date)

| Day | Task | Module | Priority | Effort |
|---|---|---|---|---|
| Mon-Wed 8-10 Jun | Property tests: adjustment immutability + audit integrity | Adjustments | P0 | 6h |
| Mon-Wed 8-10 Jun | Device registry CRUD + online/offline + per-device sync | eSSL & Devices | P1 | 12h |
| Mon-Fri 8-12 Jun | Adjustments workflow (request + approve/reject + audit) | Adjustments | P0 | 24h |
| Wed-Fri 10-12 Jun | Adjustments edge cases (bulk dates, evidence size, salary rounding, concurrent approval) | Adjustments | P1 | 8h |

**S3 Demo:** Fri 12 Jun — Internal review with Nimit. Adjustments workflow + Devices module. Compliance immutability property tests passing.

---

## 7. Sprint S4 — Reports + Quality Pass → 🎯 M3
**Window:** Mon 15 Jun – Fri 19 Jun 2026 · **Prem:** 50h · **Modules:** Reports · QA & UAT

### Goals
- All 4 reports (Daily, Monthly, Dept-wise, Location-wise) with PDF + CSV export
- Reports stress-tested with full 1800-employee dataset
- Web-responsive verification on key screens
- Bug-fix buffer for accumulated S1-S3 issues
- **M3 demo on Fri 19 Jun — Build complete + internal QA passed for Komal's written acceptance**

### Tasks (Prem, ordered by start date)

| Day | Task | Module | Priority | Effort |
|---|---|---|---|---|
| Mon-Tue 15-16 Jun | Bug-fix buffer for S1-S3 integration issues | QA & UAT | P1 | 6h |
| Mon-Fri 15-19 Jun | Reports module: Daily, Monthly, Dept, Location + PDF + CSV | Reports | P1 | 30h |
| Tue-Thu 16-18 Jun | Reports edge cases + 1800-employee stress run + filter persistence | Reports | P1 | 8h |
| Thu-Fri 18-19 Jun | Web-responsive verification (Reports, Adjustments, Live Attendance) | QA & UAT | P2 | 6h |

**S4 Demo:** Fri 19 Jun — **🎯 M3 acceptance call with Komal**. Demo: end-to-end walkthrough — auth → employee CRUD with masking → CSV/XLSX import → live attendance → adjustments → reports with PDF/CSV export → devices.

### 🎯 Milestone M3 — Build Complete & Internal QA Passed (15% retainer)
**Target:** Fri 19 Jun 2026
**Trigger:** All Phase 1 modules built (Auth, Employee Master incl. CSV+XLSX import, Attendance, Adjustments, Reports incl. PDF/CSV export, Devices, Settings hooks); Smart Anchor v2 unit tests passing in CI; internal QA report shared; demonstrated to Komal and accepted **in writing**.
**Acceptance process:**
1. Internal QA report finalised by Thu 18 Jun (carries over from S3 work)
2. Schedule M3 call with Komal Wed 17 Jun for Fri 19 Jun afternoon
3. Demo + share QA report
4. Komal issues written acceptance via email
5. **Generate Tax Invoice for M3 milestone payment**
6. Mark M3 task complete in Asana → Prem moves to S5

---

## 8. Sprint S5 — Settings + Privacy Officer + QA
**Window:** Mon 22 Jun – Fri 26 Jun 2026 · **Prem:** 50h · **Modules:** Auth · Settings · QA & UAT

### Goals
- **Privacy Officer single-user account live** (Komal's request) — only this user can unmask Aadhaar + PAN
- Settings module fully functional (incl. Privacy Officer slot management)
- Internal QA cycle on all modules (smoke + regression + cross-module integration)
- Pre-UAT readiness check

### Tasks (Prem, ordered by start date)

| Day | Task | Module | Priority | Effort |
|---|---|---|---|---|
| Mon-Wed 22-24 Jun | Privacy Officer single-user account (Aadhaar + PAN unmask) | Auth | P0 | 8h |
| Mon-Fri 22-26 Jun | Settings module (incl. Privacy Officer slot management) | Settings | P2 | 24h |
| Wed-Fri 24-26 Jun | QA expansion: cross-module integration + Settings edge cases | QA & UAT | P1 | 6h |
| Thu-Fri 25-26 Jun | Internal QA smoke + regression cycle | QA & UAT | P1 | 12h |

**S5 Demo:** Fri 26 Jun — Internal review with Nimit. Privacy Officer demo (HR Admin tries to unmask Aadhaar → 403; Privacy Officer succeeds → audit row written). Settings module walkthrough.

---

## 9. Sprint S6 — UAT → 🎯 M4
**Window:** Mon 29 Jun – Fri 3 Jul 2026 · **Prem:** 50h · **Modules:** QA & UAT · Docs

### Goals
- UAT cycle at Surendranagar HQ with Makson HR + IT
- All P1/P2 bugs closed before M4 gate
- eSSL devices integrated at all 5 operational locations (Mandideep, Gummadidala, Morbi, Aurangabad in addition to Surendranagar)
- User Manual draft finalised
- **M4 demo Fri 3 Jul — UAT passed for Komal's written acceptance**

### Tasks (Prem, ordered by start date)

| Day | Task | Module | Priority | Effort |
|---|---|---|---|---|
| Mon-Tue 29-30 Jun | UAT documentation: tester guide + scenario list for Makson | QA & UAT | P1 | 4h |
| Mon-Fri 29 Jun-3 Jul | UAT support at Surendranagar — bug triage, fixes, multi-location deploy | QA & UAT | P0 | 30h |
| Mon-Fri 29 Jun-3 Jul | User Manual draft (HR Admin + Compliance Auditor + Privacy Officer) | Docs | P2 | 16h |

**S6 Closeout:** Fri 3 Jul afternoon — **🎯 M4 acceptance call with Komal**. UAT closeout report shared. All P1/P2 bugs closed. eSSL devices live at all 5 sites.

### 🎯 Milestone M4 — UAT Passed & Errors Fixed (10% retainer)
**Target:** Fri 3 Jul 2026
**Trigger:** UAT cycle completed at Surendranagar; all P1/P2 defects closed; eSSL devices integrated and pushing data across all 5 operational locations; UAT sign-off issued **in writing** by Komal.
**Acceptance process:**
1. UAT runs Mon 29 Jun – Thu 2 Jul (4 working days) with daily standups
2. UAT closeout meeting Fri 3 Jul morning
3. Komal issues UAT sign-off via email by Fri 3 Jul EOD
4. **Generate Tax Invoice for M4 milestone payment**
5. Mark M4 task complete in Asana → Prem moves to S7

### Critical path
- **Multi-location device deployment** — Makson IT physically installs eSSL devices at 4 other sites; Prem confirms each is pushing data. If Makson IT slow on physical install, M4 slips. Mitigation: confirm timeline with Komal in W7 review (Wed 17 Jun).

---

## 10. Sprint S7 — Deploy + Handover → 🎯 M5
**Window:** Mon 6 Jul – Fri 10 Jul 2026 · **Prem:** 50h + Nimit 3h · **Modules:** Deploy · Docs

### Goals
- Production deployment on Makson on-prem server
- Pre-handover security checklist completed and signed off
- Handover bundle dry-run validates self-contained deployability
- Source code + credentials transferred to Makson IT admin
- Online training session delivered (recorded)
- 24h post-deploy on-call buffer
- **M5 demo Fri 10 Jul — Project formally complete with final written sign-off**

### Tasks (ordered by start date)

| Day | Task | Module | Owner | Priority | Effort |
|---|---|---|---|---|---|
| Mon-Tue 6-7 Jul | Production deploy on Makson on-prem server | Deploy | Prem | P0 | 10h |
| Mon-Tue 6-7 Jul | Pre-handover security checklist + sign-off | Deploy | Prem | P0 | 4h |
| Mon-Thu 6-9 Jul | Admin Setup Guide + System Architecture Document | Docs | Prem | P1 | 16h |
| Tue-Wed 7-8 Jul | Handover bundle dry-run on clean VM | Deploy | Prem | P0 | 4h |
| Wed-Thu 8-9 Jul | Source code + credentials handover (M5 trigger) | Deploy | Prem | P0 | 4h |
| Wed-Thu 8-9 Jul | Knowledge-transfer materials for IT admin (FAQ + runbooks) | Docs | Prem | P1 | 4h |
| Thu 9 Jul | Online training session for HR + IT (up to 2 hrs) | Deploy | Nimit | P1 | 3h |
| Thu-Fri 9-10 Jul | Post-deploy on-call buffer / contingency | Deploy | Prem | P0 | 8h |

**M5 acceptance:** Fri 10 Jul afternoon — final demo + walkthrough of handover bundle item-by-item with Komal, signed acknowledgement form, final sign-off.

### 🎯 Milestone M5 — Final Handover & Sign-off (10% retainer)
**Target:** Fri 10 Jul 2026
**Trigger:** Deployment complete on Makson on-premise server; training delivered; full source code + documentation + database admin credentials + application admin credentials transferred to Makson; final written sign-off issued by Komal.
**Acceptance process:**
1. Production deploy complete by Tue 7 Jul EOD
2. 48h soak (no P1 issues observed)
3. Training session Thu 9 Jul afternoon (recorded via Teams)
4. M5 acceptance call Fri 10 Jul afternoon
5. Komal issues final sign-off via email
6. **Generate final Tax Invoice for M5 milestone payment**
7. Project closure email to Komal: thank-you + AMC quote attached + key contacts for ongoing support
8. Move all deliverables to long-term archive

### Post-M5 (warranty period — out of project plan but contractually committed)
- 90-day knowledge-transfer support (capped 10h consultative time per SoW Clause 10.5)
- 3-month free post-deployment support per SLA in SoW Clause 8 (P1 24x7, P2 4h response, etc.)
- Optional AMC at terms to be agreed in writing if Makson signs

---

## 11. Communication Cadence (entire project)

| Event | Cadence | Audience | Channel | Owner |
|---|---|---|---|---|
| Internal check-in | Mon + Thu (twice weekly) | Nimit + Prem | Microsoft Teams | Prem (status update) |
| Sprint demo + close | Fri (every week) | Nimit + Prem | Teams (recorded) | Prem |
| Weekly status email | Fri (every week) | Komal + Kalpesh (cc) | Email | Nimit |
| Bi-weekly review call | Alt Wednesdays | Nimit + Komal + Kalpesh | Teams | Nimit |
| Milestone acceptance demo (M2, M3, M4, M5) | Sprint-end as per timeline | Komal + Nimit + Prem | Teams (recorded) | Nimit (lead) + Prem (technical) |
| Tax Invoice issuance | Within 24h of written acceptance | Makson Finance | Email | Nimit |

---

## 12. Critical Path & Top Risks

### Critical path
1. **Smart Anchor PRNG determinism (W2 Day 2-3)** — if property tests fail, all downstream Smart Anchor work delays. Mitigation: Nimit drafts design doc in W1 with worked examples; Prem reviews on Day 1; coding starts Day 2 with full understanding.
2. **eSSL device probe (W4 Day 1-2)** — if device behaviour diverges from parser assumptions, M2 gate at risk. Mitigation: surface immediately; escalate to Makson IT on Day 1.
3. **Multi-location device deployment (W9)** — Makson IT physically installs at 4 other sites; M4 gate slips if delayed. Mitigation: confirm IT timeline at W7 bi-weekly review.

### Top 5 risks (by impact × likelihood)

| Risk | Mitigation |
|---|---|
| Makson IT slow on server creds → S0 setup blocked | Email request out by Fri 1 May; weekly chase if no response by Mon 4 May |
| eSSL device incompatibility surfaces late → M2 slips | Probe is Day 1 of S2; if fails, escalate same day; SoW §12 has fallback clause for fundamental incompatibility |
| Komal unavailable for milestone acceptance windows | Pre-book M2/M3/M4/M5 calendar slots at S0 setup; bi-weekly cadence keeps her engaged |
| Prem hits unplanned personal event during sprint | Schedule has 0% slack at Prem 10h/day target; if anything personal arises, Nimit absorbs admin/coordination work + sprint slips by exactly the lost days |
| Scope creep from Komal mid-sprint | Visual spec is locked 30 Apr; SoW §7 says Change Requests required; respond firmly + politely with CR template |

---

## 13. Retainer Payment Schedule (single source of truth)

| # | Milestone | Sprint end | Retainer % | Trigger |
|---|---|---|---|---|
| **M1** | Kickoff | Wed 29 Apr 2026 ✅ | **50%** | Signed docs + token (DONE) |
| **M2** | Device Connection Verified | Fri 5 Jun 2026 | **15%** | eSSL live in dev + Komal written acceptance |
| **M3** | Build Complete & Internal QA Passed | Fri 19 Jun 2026 | **15%** | All modules built + QA report + Komal written acceptance |
| **M4** | UAT Passed & Errors Fixed | Fri 3 Jul 2026 | **10%** | UAT closeout + 5-site rollout + Komal written acceptance |
| **M5** | Final Handover & Sign-off | Fri 10 Jul 2026 | **10%** | Deploy + handover bundle + final sign-off |

**For every milestone after M1:**
1. Komal issues written acceptance (email)
2. Nimit issues Tax Invoice within 24h (use legal-docs/04_invoice.js as template)
3. Makson Finance pays within 7 business days (per MSA Clause 5.5)
4. Late payment >15 days from invoice → simple interest 1.5%/month per MSA Clause 5.6

---

## 14. Acceptance Criteria for Each Milestone (so Komal knows exactly what to verify)

### M2 — Device Connection Verified (target Fri 5 Jun)
- [ ] At least one eSSL SilkBio-101TC device at Surendranagar HQ pushing live punches into MAMS dev environment
- [ ] MAMS captures raw punch within 5 seconds of physical scan
- [ ] Smart Anchor v2 generates compliant punch within 8-hour window of employee's alternateTimeShift
- [ ] Live attendance log dashboard reflects punches in real time
- [ ] Demonstrated live to Komal in Teams call with screenshare
- [ ] Komal issues written acceptance via email

### M3 — Build Complete & Internal QA Passed (target Fri 19 Jun)
- [ ] All Phase 1 modules functional: Auth (with 4 roles incl. Privacy Officer), Employee Master + CSV/XLSX import, Attendance + bulk import, Adjustments, Reports + PDF/CSV export, Devices, Settings
- [ ] Smart Anchor v2 unit tests passing in CI
- [ ] Masking property tests passing (1000+ random cases, no leakage)
- [ ] Adjustment immutability property tests passing
- [ ] Internal QA report shared with Komal listing all modules + bug counts by severity
- [ ] All P1 bugs closed; P2 bugs scheduled for S5/S6
- [ ] Demonstrated end-to-end to Komal
- [ ] Komal issues written acceptance via email

### M4 — UAT Passed & Errors Fixed (target Fri 3 Jul)
- [ ] UAT cycle run at Surendranagar HQ with HR + IT participation
- [ ] All P1 bugs surfaced during UAT closed (same-day per SLA)
- [ ] All P2 bugs surfaced during UAT closed within 48h
- [ ] eSSL devices live and pushing data at all 5 operational sites: Surendranagar, Mandideep, Gummadidala, Morbi, Aurangabad
- [ ] UAT closeout report with: tickets, severity, modules affected, % closed
- [ ] Privacy Officer Aadhaar + PAN unmask flow tested by Komal personally
- [ ] Komal issues UAT sign-off via email

### M5 — Final Handover & Sign-off (target Fri 10 Jul)
- [ ] Production deployment complete on Makson on-prem server
- [ ] 48-hour soak with no P1 issues
- [ ] Pre-handover security checklist signed off by Nimit
- [ ] Handover bundle dry-run on clean VM successful
- [ ] Source code transferred (Git bundle or USB at Makson preference)
- [ ] Database admin credentials transferred (sealed envelope or 1Password share)
- [ ] Application admin credentials transferred
- [ ] Privacy Officer credentials transferred separately
- [ ] All env config files transferred
- [ ] Deployment scripts + runbooks transferred
- [ ] User Manual + Admin Setup Guide + System Architecture Document delivered (PDF + Markdown)
- [ ] Knowledge-transfer FAQ + runbooks delivered
- [ ] Online training session delivered and recorded
- [ ] Komal issues final sign-off via email + signed acknowledgement form

---

## 15. Out of Phase 1 Scope (do not build — addressable as Change Requests or Phase 2)

Per SoW §3:
- Aadhaar UIDAI checksum / format validation
- Enterprise letterhead PDF (only plain print-to-PDF in Phase 1)
- Indian DD/MM/YYYY date standardisation across exports
- In-app brand-asset upload UI
- Payroll calculation, PF/ESI/PT returns, TDS, Form 16
- Leave management module
- Mobile apps
- SMS/WhatsApp/email notifications
- Multi-language UI
- Cloud hosting

Per visual spec freeze (30 Apr 2026):
- Any UI variation beyond approved Netlify mockup screens

If any of these are requested mid-project, respond: *"Per SoW §7 Change Management, this requires a written Change Request before being undertaken. I'll prepare an impact assessment with effort, fees, and timeline within 5 business days for your decision."*

---

**Document version:** v1 · **Last updated:** 30 Apr 2026
**Single source of truth:** This file + Asana project [MAMS — Makson Phase 1](https://app.asana.com/1/1209462166057632/project/1214413615913479)
