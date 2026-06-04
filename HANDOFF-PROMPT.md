# Handoff Prompt for Claude Code

Copy everything below this line and paste it as your first message to Claude Code.

---

Hi Claude. I'm Nimit Kaneria, CEO of Infoloop Technologies LLP. I'm shifting an active client engagement to Claude Code from claude.ai chat.

**Project:** MAMS (Makson Attendance Management System) for Makson Pharmaceuticals (India) Pvt. Ltd. — full stack MERN build deployed on client's on-premise server. ₹7,50,000 + GST contract, 8-10 week Phase 1.

**Please do this first:**
1. Read `CLAUDE.md` end-to-end — it contains full project context, legal entities, tech architecture, scope, and house rules
2. Read `README.md` for the folder layout
3. Skim `mockup/index.html` to understand the intended UX (it's the visual spec — do NOT reimplement Phase 2 features like report downloads or brand asset uploads)
4. Skim `legal-docs/02_sow.js` to confirm what's in Phase 1 scope vs Phase 2

**Current project status:**
- Legal documents (MSA, SoW, NDA, DPA, Proforma Invoice) are finalized and in `final-docs/` — ready to send to client
- Awaiting signed contracts + ₹4,42,500 token payment
- Kickoff date: Monday 20 April 2026

**What I need help with next (pick one and tell me which you want to do):**

**Option A — Send the legal docs right now**
Draft the email to Mrs. Komal Makasana (CFO & Partner, Makson) with Mr. Kalpesh Makasana in CC, attaching all 5 docs. Deadline: 17 April for signed copies + token payment, Monday 20 April kickoff. I need the email body I can paste into Gmail.

**Option B — Scaffold the MERN project**
Set up the repo structure: `mams-server/` (Express + Mongoose + TypeScript), `mams-web/` (Vite + React + TypeScript + Tailwind), root monorepo `package.json`, shared `types/` folder, Nginx config template, PM2 ecosystem file, `.env.example`, ESLint + Prettier config, a Smart Anchor v2 engine stub with unit tests.

**Option C — Build the database schemas**
Write Mongoose schemas for: Users (with viewMode role), Employees, Attendance (with hours decomposition), Adjustments (immutable audit trail), Devices, Settings. Include indexes, validation, and TypeScript interfaces. Create seed data matching the mockup's `EMPS` array.

**Option D — Smart Anchor v2 engine**
Build and test the Smart Anchor engine as a standalone TypeScript module with unit tests. Deterministic (seeded PRNG by `employeeId + date`), takes real punch + alternateTimeShift window, returns compliant punch within window. Test for reproducibility and edge cases (midnight rollover, night shifts, weekly off days).

**Option E — Something else**
Tell me what's on your mind.

---

**Important context:**
- Do NOT introduce Phase 2 features into Phase 1 code
- Hours are source of truth, not days (standard divisor 9.5 hrs/day)
- Timezone is Asia/Kolkata everywhere — store UTC, display IST
- Smart Anchor must be deterministic — same inputs always produce same outputs
- All data stays on Makson's on-prem server — no cloud services at runtime
- Validate PAN + IFSC, skip Aadhaar validation (that's Phase 2)

What do you want to start with? Reply with **A**, **B**, **C**, **D**, or **E**.
