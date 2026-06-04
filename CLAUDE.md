# MAMS — Makson Attendance Management System

Project context for Claude Code. Read this fully before starting any task.

---

## 1. Project Summary

**Client:** Makson Pharmaceuticals (India) Pvt. Ltd. — FMCG/pharma manufacturer, ~1800 employees, HQ Surendranagar Gujarat.
**Provider:** Infoloop Technologies LLP (Nimit Kaneria, CEO).
**Contract value:** ₹7,50,000 + 18% GST = ₹8,85,000 total. Payment schedule: 50% kickoff / 30% on software ready / 20% on completion.
**Status:** Quotation accepted. Legal documents (MSA, SoW, NDA, DPA, Proforma Invoice) prepared and ready to send. Awaiting signed contracts + token payment of ₹4,42,500 to begin kickoff on **Monday 20 April 2026**.
**Phase 1 timeline:** 8–10 weeks.

### What MAMS Is

An attendance management system with a **dual-credential compliance architecture**:

- Two logins opening the **same UI**: one shows real internal data (`hr.admin@makson-group.com` / `makson2026`), the other shows compliance-adjusted data (`hr.compliance@makson-group.com` / `makson2026`).
- Real shifts are 2×12hr (Day 6AM–6PM, Night 6PM–6AM). Compliance shifts are 3×8hr (A: 6AM–2PM, B: 2PM–10PM, C: 10PM–6AM).
- Each employee has a **Time Shift** (actual) + **Alternate Time Shift** (compliance). Cross-mapping allowed (Day worker can appear in Night compliance shift).
- A **Smart Anchor Engine v2** generates compliant timestamps within the assigned 8-hour window using a seeded PRNG for deterministic reproducibility.
- Hours are the source of truth (not days). OT hours convert to equivalent days for payroll. Standard divisor: **9.5 hrs/day**. OT absorbs paid holidays.

---

## 2. Key People

| Role | Name | Contact |
|---|---|---|
| Client PM / SPOC | **Mrs. Komal Makasana** | CFO & Partner, Makson |
| Client Director | Mr. Kalpesh Dhanjibhai Makasana | Director, Makson |
| Provider signatory | **Mr. Nimit Kaneria** | Designated Partner & CEO, Infoloop · +91 97261 81000 · Sales@infoloop.co |

---

## 3. Legal Entities (Verified from Official Documents)

### Makson Pharmaceuticals (India) Private Limited
- CIN: `U24231GJ1986PTC008718`
- GSTIN: `24AABCM2806L1ZM`
- Registered Office: 195, Rajkot Highway, Surendranagar, Wadhwancity, Gujarat 363020, India
- Directors: Kalpesh Dhanjibhai Makasana, Dhanjibhai Anandjibhai Makasana
- Revenue FY24: ~₹190 Cr

### Infoloop Technologies LLP
- GSTIN: `24AAKFI1283K1Z8`
- PAN: `AAKFI1283K`
- Operational Office: Suite 1101, Rajhans Skylar, Udhna Magdalla Road, Surat, Gujarat 395007
- GST-registered office: Building No. 64, Himgiri Bungalows, Gaurav Path, near Rajhans Cinemas, Piplod, Surat 395007 (per GST certificate — kept on file but docs use Skylar as operational address)
- Designated Partners: Nimitkumar Kaneria (CEO), Rahul Amitbhai Kaneria
- Bank: HDFC Parle Point Surat · A/c 50200084224282 · IFSC HDFC0000067 · UPI 9726181000@hdfcbank

---

## 4. Technical Architecture

### Stack (non-negotiable — confirmed with client)
- **MERN:** MongoDB + Express.js + React + Node.js
- **Deployment:** On the **Client's on-premise server** (Makson provides hardware; Infoloop installs + configures)
- **Runtime tooling on server:** Node.js, MongoDB, PM2, Nginx (reverse proxy)
- **Minimum server specs (Client to provide):** Linux OS, 8 GB RAM, 250 GB SSD, static IP, regular automated backups

### Biometric Devices
- ✅ **eSSL SilkBio-101TC** — fully compatible via Push Data Technology (ADMS protocol). Device tested: SN TFDB244600829, IP 192.168.0.240. Specs: 2000 Face / 3000 Finger / 3000 Card / 100K transaction offline buffer.
- ❌ **Hanvon FaceID F710** — incompatible (proprietary protocol). Client has agreed to replace with eSSL units (~₹20,000 each) before kickoff.

### Hours-Based Architecture (Critical)
Makson pays hourly, not daily. Treat hours as source of truth, days as output:
- Real gross hours → deduct break → real net hours
- Compliant hours capped at 9.5/day
- OT hours = realNet − 9.5 (when positive)
- Equivalent days = total compliant hours / 9.5
- Day type: Working / Weekly Off / Absent
- Payroll calc itself is **deferred to Phase 2**

---

## 5. Phase 1 Scope (per SoW)

### In Scope
1. **Authentication & Dual-Credential System** — two creds, same UI, different data views
2. **Employee Master** — full CRUD, multi-day weekly off as array, PAN/IFSC validation (Aadhaar captured but NOT validated in Phase 1)
3. **Attendance Capture** — eSSL ADMS integration, Smart Anchor v2, hours decomposition
4. **Attendance Adjustments** — HR-initiated with mandatory justification + evidence + salary impact, single/bulk approve, immutable audit trail
5. **Reports** — Daily, Monthly, Dept-wise, Location-wise: on-screen viewing with filter/sort/pagination; **plain PDF** (browser print-to-PDF, no enterprise letterhead); **CSV export** for offline use. **NO enterprise letterhead PDF** in Phase 1 (deferred to Phase 2 per SoW §3)
6. **Devices Module** — registry, online/offline status, per-device and global sync
7. **Settings** — compliance info, weekly off, time shifts, Smart Anchor config, user management, confidentiality notice. **NO in-app brand asset uploads in Phase 1** (branding configured at deployment time)
8. **Documentation & Training** — User Manual, Admin Setup Guide, System Architecture Doc, inline source code docs, 1 online training session (2hr)

### Deferred to Phase 2 (explicitly documented in SoW § 3)
- Aadhaar number format / checksum validation
- Enterprise letterhead PDF with compliance details
- Date format standardisation across exports
- In-app brand asset management (logo/favicon upload UI)
- Payroll calculation, PF/ESI/PT returns, TDS, Form 16
- Leave management module
- Mobile apps (web-responsive only in Phase 1)
- SMS/WhatsApp/email notifications
- Multi-language UI (English only)
- Cloud hosting (on-prem only)

---

## 6. Directory Layout

```
mams-handoff/
├── CLAUDE.md                    ← this file
├── README.md                    ← setup instructions
├── HANDOFF-PROMPT.md            ← paste this into Claude Code to continue
├── legal-docs/                  ← source code for the 5 legal DOCX files
│   ├── _shared.js                 (brand colors, helpers, signatureBlock, esignNote)
│   ├── 01_msa.js
│   ├── 02_sow.js
│   ├── 03_nda.js
│   ├── 04_invoice.js              (currently PROFORMA invoice)
│   ├── 05_dpa.js
│   └── assets/logo_full.png
├── final-docs/                  ← compiled DOCX ready to send to Makson
│   ├── 01_Master_Services_Agreement.docx
│   ├── 02_Statement_of_Work.docx
│   ├── 03_Mutual_NDA.docx
│   ├── 04_Proforma_Invoice.docx
│   └── 05_Data_Processing_Agreement.docx
├── mockup/                      ← interactive HTML prototype (~194KB single file)
│   ├── index.html               (all views: login, dashboard, employees, attendance, adjustments, reports, devices, settings)
│   ├── _redirects
│   └── netlify.toml
├── mams/                        ← MERN monorepo (mams-server + mams-web + shared types) — primary Phase 1 codebase
├── mockup-vite/                 ← Vite-packaged variant of the UX prototype (optional local dev)
├── db/                          ← placeholder (schemas live in mams/mams-server/src/models/)
└── docs/                        ← development-scope.md, tech PDFs (SAD, DB schema, ADMS, setup); user manuals TBD
```

---

## 7. Brand System

- **Primary Blue:** `#1D5DBF` (also primaryDark)
- **Accent Green:** `#7AC142` (accent), `#5A9931` (accentDark — e-sign label)
- **Dark text:** `#0F172A`
- **Font:** Calibri (DOCX), Outfit (web — infoloop.us)
- **Logo:** `legal-docs/assets/logo_full.png` (white background, 599×300)

---

## 8. Legal Docs — Tech Details

### Stack
- **docx-js** (JavaScript) generates .docx files
- Node modules path: `/home/claude/.npm-global/lib/node_modules`
- Each `.js` file imports from `_shared.js` (helpers: `p`, `h1`, `h2`, `h3`, `bullet`, `kvTable`, `dataTable`, `signatureBlock`, `esignNote`, etc.)

### Regenerate Docs
```bash
cd legal-docs
export NODE_PATH=/home/claude/.npm-global/lib/node_modules  # or your global path
for f in 01_msa.js 02_sow.js 03_nda.js 04_invoice.js 05_dpa.js; do node $f; done
```

### Known docx-js Gotchas
- **Paragraph borders serialize in wrong order** (top→bottom→left→right instead of OOXML-required top→left→bottom→right). **Workaround:** use single-cell sub-tables for borders — `TableCell.borders` serializes correctly. Applied in `signatureBlock` and `esignNote` in `_shared.js`.
- **Validate after each change:** `python3 /mnt/skills/public/docx/scripts/office/validate.py <file>.docx`
- **Preview:** `python3 /mnt/skills/public/docx/scripts/office/soffice.py --headless --convert-to pdf <file>.docx && pdftoppm -jpeg -r 100 <file>.pdf preview`

### Invoice Nuance
The invoice is currently a **Proforma Invoice** (not a Tax Invoice). GST liability triggers only on Tax Invoice issuance. Once Makson pays the ₹4,42,500 token, issue the Tax Invoice:
- Change title: `PROFORMA INVOICE` → `TAX INVOICE`
- Change reference: `ITL/PI/MAKSON/2026-04-001` → `ITL/INV/MAKSON/2026-04-001`
- Remove proforma disclaimer block
- Update filename: `04_Proforma_Invoice.docx` → `04_Tax_Invoice.docx`
- Issue Date = date payment received

---

## 9. Mockup Details

`mockup/index.html` is a single ~194KB HTML file (React + Tailwind via CDN) with all screens wired up. It demonstrates:

- **Login** — single page with dual-credential routing (type "compliance" to see compliant view)
- **Dashboard** — clickable stat tiles, bar chart day selector, donut, sortable/filterable table, employee names link to profile, live IST clock
- **Employees** — add/edit modals, **weekly off as 7-day checkbox row** (multi-select pills Mon–Sun), validation via `V` object
- **Employee Detail** — profile + statutory/bank card + 7/14/30 day attendance toggle, weekly off shown as blue badges, **Hours Summary card** (5 tiles: Total Real Hours, Compliant Hours, OT Hours, Equivalent Days, Day Breakdown P/A/WO)
- **Attendance Log** — live raw punch feed, 4 stat tiles, Pause/Resume
- **Reports** — Preview, print-to-PDF, and CSV-style export patterns (production Phase 1 follows SoW: plain PDF + CSV; **enterprise letterhead PDF is Phase 2**). PDF view may use `window.print()` for demo
- **Adjustments** — 5 demo records, 4 stat tiles (clickable filters), per-card checkboxes for bulk select, "Select All Pending" + bulk approve/reject, review modal with approver notes, cards show Reason / Justification / Supporting Evidence / Salary Impact / Before→After→Impact%
- **Devices** — 9 demo devices, 4 interactive tiles, Sync Now per device + Sync All
- **Settings** — Brand Assets, Company Name, Compliance Info (CIN/GSTIN/PF/ESI/Factory Licence/etc), Time Shifts, Smart Anchor toggle, Users table, Confidentiality Notice toggle

**Important:** the mockup may show **brand asset uploads** and other Phase 2 UX for demo. Phase 1 production: **plain report PDF/CSV yes**; **enterprise letterhead PDF and in-app brand uploads no** (branding at deploy time per SoW).

Key globals in the mockup:
- `EMPS` — employee data with `weeklyOff: string[]` arrays
- `genAtt()` — attendance generator with realHrs, compHrs (capped 9.5), otHrs, brkMin (default 30), dayType
- `fmtD()` — formats dates as DD/MM/YYYY
- `WEEKDAYS` — `['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']`

---

## 10. What to Build First (Suggested Week 1–2 Plan)

The runnable MERN monorepo already lives under **`mams/`** (see [DEVELOPER-HANDOFF.md](DEVELOPER-HANDOFF.md)). Remaining Phase 1 work is module polish, UAT, and on-prem hardening rather than greenfield scaffold.

1. **Validate local setup** — MongoDB, `npm install`, `npm run seed`, `npm run dev:server` + `npm run dev:web`, log in as both seed users
2. **Environment setup** — production MongoDB connection string, CORS, Nginx config from `mams/ops/`
3. **Auth hardening** — review JWT rotation, lockout, and audit events in production config
4. **eSSL ADMS** — verify push receiver against a real device; refine device sync if full ATTLOG pull is required (see `devices.routes.ts` TODO)
5. **Reports / exports** — confirm CSV + print-to-PDF meet SoW; add CSV for other report tabs if the Client requires parity
6. **E2E smoke tests** — Playwright (or equivalent) against critical paths (dev-scope §10.3)
7. **Documentation** — User Manual, Admin Setup Guide (deliverables per SoW §2.8)

---

## 11. Contact & Payment Info

- **Kickoff date:** Monday 20 April 2026 (pending signed docs + token payment)
- **Token payment required:** ₹4,42,500 (₹3,75,000 + ₹67,500 GST @ 18%)
- **Payment deadline:** 17 April 2026 (3 business days before kickoff)
- **Bank details:** In `final-docs/04_Proforma_Invoice.docx`

---

## 12. House Rules for Claude Code

1. **Never reintroduce Phase 2 features into Phase 1 code.** Reports: on-screen + **plain PDF** (print) + **CSV** only; **no enterprise letterhead PDF**, no export date-format standardisation across files. Brand assets are seeded at deploy time, not via UI.
2. **Hours are source of truth.** Never let a day-based calc sneak in. Always compute hours first, derive days last using `÷9.5`.
3. **Dual view must be at query layer, not at table layer.** There is ONE attendance table. The `viewMode` tag on the request determines which fields (`realGrossHours`, `realNetHours`, `compliantHours`) get returned / masked.
4. **Smart Anchor must be deterministic.** Same employee + same date + same real punch → always same compliant punch. Seed the PRNG with `employeeId + YYYY-MM-DD`.
5. **Timezone is Asia/Kolkata everywhere.** Store in UTC, display in IST. Use `date-fns-tz`.
6. **Validate PAN + IFSC, NOT Aadhaar.** (Aadhaar validation is Phase 2.)
7. **Audit log is immutable.** Adjustments create new records, never mutate.
8. **Run `npm run validate` before every commit** (once tooling is set up) — should lint, typecheck, and run unit tests on the Smart Anchor engine.
9. **Prefer editing existing files over creating new ones** unless a clean separation is needed.
10. **On-prem deployment means no cloud services at runtime.** No S3, no Cloudinary, no external auth providers. All data stays on Makson's server.

---

## 13. Reference: Previous Chat Transcripts

Prior conversations are stored in `/mnt/transcripts/` (5 files spanning 20 Mar 2026 → 15 Apr 2026). They contain the full back-and-forth with Nimit including:
- Initial proposal discovery (16+ legal entities, 6 factory locations)
- Mockup iterations (~40+ versions)
- Supabase exploration (abandoned in favor of on-prem MongoDB)
- Payroll sample analysis (deferred to Phase 2)
- Device compatibility testing (eSSL ✅, Hanvon ❌)
- Legal document drafting and revision cycle

If something seems unclear or conflicts, these transcripts are the source of truth for client intent.
