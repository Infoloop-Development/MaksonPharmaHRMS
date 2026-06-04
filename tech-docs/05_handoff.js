const fs = require('fs');
const path = require('path');
const { Document, Packer } = require('docx');
const S = require('./_shared.js');

const doc = new Document({
  styles: S.styles, numbering: S.numbering,
  sections: [{
    properties: { page: S.PAGE },
    headers: { default: S.buildHeader('Developer Handoff Package') },
    footers: { default: S.buildFooter() },
    children: [
      ...S.titleBlock('DEVELOPER HANDOFF', 'MAMS - Makson Attendance Management System'),

      S.kvTable([
        ['Project', 'Makson Attendance Management System (MAMS)'],
        ['Client', 'Makson Pharmaceuticals (India) Pvt. Ltd.'],
        ['Provider', 'Infoloop Technologies LLP'],
        ['Project Lead / SPOC', 'Mr. Nimit Kaneria - Nimit.Kaneria@infoloop.co - +91 97261 81000'],
        ['Kickoff', 'Wednesday 29 April 2026'],
        ['Target Handover', 'Week of 24 June 2026 (8-10 weeks)'],
        ['Document Version', 'v1 - 30 April 2026'],
      ]),
      S.spacer(280),

      S.mockupCallout(),
      S.spacer(280),

      S.h2('1. WHAT YOU HAVE RECEIVED'),
      S.p('This handoff package contains everything the engineering team needs to build MAMS Phase 1, organised in a single mams-handoff/ folder:'),
      S.spacer(80),
      S.dataTable(
        ['Category', 'Where', 'What'],
        [
          ['Master context', 'CLAUDE.md', 'Project context, house rules, decisions already made. Read first.'],
          ['Transmittal', 'DEVELOPER-HANDOFF.md', 'This document - reading order, quick start, sprint plan'],
          ['Functional scope', 'docs/development-scope.md (+ DOCX/PDF)', 'What the team is being asked to build, module by module'],
          ['Technical specs', 'docs/tech/', '4 branded PDFs: SAD, DB Schema, eSSL ADMS, Setup Guide'],
          ['Production scaffold', 'mams/', 'MERN monorepo, runnable. The starting codebase.'],
          ['Visual reference', 'mockup/ and mockup-vite/', 'The approved UX prototype, in two flavours'],
          ['Approved mockup live', 'https://makson-payroll-mockup.netlify.app', 'The deployed mockup the Client signed off on'],
          ['Legal docs (reference)', 'final-docs/v2/', 'Signed contractual scope. Team does not sign these but should know what was committed.'],
          ['Dev server config', '.claude/launch.json', 'Pre-configured dev server launchers'],
        ],
        [2400, 3500, 6180]
      ),

      S.h2('2. READING ORDER (FIRST 4 HOURS)'),
      S.p('Read these in this order. Do not skip ahead.'),
      S.spacer(80),
      S.dataTable(
        ['#', 'Time', 'Document', 'Why'],
        [
          ['1', '15 min', 'CLAUDE.md', 'Project context. The single most important document.'],
          ['2', '10 min', 'DEVELOPER-HANDOFF.md (this doc)', 'Reading order + sprint plan'],
          ['3', '30 min', 'docs/development-scope.md', 'All 8 modules in functional detail, IN and OUT scope'],
          ['4', '60 min', 'docs/tech/01_System_Architecture_Document.pdf', 'Tier breakdown, key decisions, security, deployment'],
          ['5', '45 min', 'docs/tech/02_Database_Schema_Reference.pdf', 'Field-by-field collection spec - the data layer ground truth'],
          ['6', '30 min', 'docs/tech/03_eSSL_ADMS_Protocol_Cheatsheet.pdf', 'Wire protocol for biometric device integration'],
          ['7', '30 min', 'docs/tech/04_Local_Dev_Setup_Guide.pdf', 'Step-by-step "your laptop to running app"'],
          ['8', '30 min', 'Browse the live mockup', 'Visual / behavioural source of truth'],
        ],
        [500, 1000, 4500, 6080]
      ),
      S.p('Total: ~4 hours. After this, you should know what is being built, why it is being built that way, and how to set up your local environment.'),

      S.h2('3. QUICK START - FIVE COMMANDS'),
      S.codeBlock(`# 0. Make sure MongoDB is running locally
brew services start mongodb-community@7.0     # or: docker run -d -p 27017:27017 mongo:7

# 1. cd into the codebase
cd mams-handoff/mams

# 2. Install workspace dependencies (313 packages, ~25 sec)
npm install

# 3. Generate JWT secrets and write .env
cp mams-server/.env.example mams-server/.env
sed -i '' "s|JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$(openssl rand -base64 32)|" mams-server/.env
sed -i '' "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(openssl rand -base64 32)|" mams-server/.env
cp mams-web/.env.example mams-web/.env

# 4. Seed the database
#    Creates 2 users, 9 devices, 1,800 employees, ~25,000 raw punches over 7 days,
#    ~12,600 derived records via Smart Anchor v2. Takes ~30-60 seconds.
npm run seed

# 5. Run dev servers (in two terminals)
npm run dev:server     # http://localhost:3001
npm run dev:web        # http://localhost:5173

# Login at http://localhost:5173
#   hr.admin@makson-group.com  / makson2026   (real, 12-hour view)
#   hr.compliance@makson-group.com / makson2026  (compliant, 8-hour view)`),

      S.h2('4. WHAT IS BUILT vs WHAT IS STUBBED'),
      S.h3('4.1 Built and runnable'),
      S.bullet('Monorepo + workspaces, shared Zod types.'),
      S.bullet('Auth (login, refresh rotation, lockout, audit).'),
      S.bullet('Employees - list, detail, masking, role-gated unmask, audit.'),
      S.bullet('Attendance capture - eSSL ADMS push receiver, raw insert.'),
      S.bullet('Smart Anchor v2 with 12 passing unit tests.'),
      S.bullet('Hours decomposition (real / compliant / OT / day type).'),
      S.bullet('Dashboard - stats, weekly trend.'),
      S.bullet('Audit log infrastructure with sensitive-field unmask audit.'),
      S.bullet('Web frontend (Vite + React + Tailwind) - Login, Sidebar, Dashboard, Employees list/detail, Attendance Log.'),
      S.bullet('Seed script (1,800 employees, 7 days of attendance) and eSSL device simulator.'),
      S.bullet('Nginx + PM2 ops examples.'),

      S.h3('4.2 Stubbed - your work to flesh out'),
      S.dataTable(
        ['Module', 'Status', 'Spec reference'],
        [
          ['Adjustments workflow', 'Stub returns 501', 'SoW §2.4, DB Schema §7'],
          ['Reports (PDF / CSV export)', 'Stub returns 501', 'SoW §2.5, SAD §5.4'],
          ['Devices admin (sync, registration)', 'Read works, mutations stubbed', 'SoW §2.6'],
          ['Settings editor (audit on change)', 'Read works, write stubbed', 'SoW §2.7, DB Schema §9'],
          ['CSV bulk import', 'TODO - not yet added', 'SoW §2.2'],
          ['E2E tests (Playwright smoke)', 'TODO', 'dev-scope §10.3'],
          ['Letterhead PDF + date format', 'PHASE 2 - DO NOT BUILD', 'SoW §3'],
        ],
        [3500, 3500, 5080]
      ),

      S.h2('5. SPRINT PLAN (8-10 WEEKS)'),
      S.p('From the legal SoW v2 Clause 5:'),
      S.spacer(80),
      S.dataTable(
        ['Milestone', 'Trigger', 'When', 'Engineering work'],
        [
          ['M1 Kickoff', 'Signed docs received', 'Week 1', 'Onboarding, env validation, eSSL device compatibility check'],
          ['M2 Device Connection Verified', 'eSSL pushing live in dev', 'End of Week 4', 'Seed → CSV import → Auth hardened → eSSL receiver with real device → live attendance log'],
          ['M3 Build Complete & QA Passed', 'All Phase 1 modules built', 'End of Week 7', 'Adjustments → Reports → Devices admin → Settings editor → internal QA'],
          ['M4 UAT Passed & Errors Fixed', 'Surendranagar UAT complete', 'End of Week 9', 'UAT cycle → P1/P2 defects closed → eSSL across all 5 locations'],
          ['M5 Final Handover & Sign-off', 'On-prem deploy + handover', 'End of Week 10', 'Deploy → Manuals → training → source code + creds handover → written sign-off'],
        ],
        [2200, 2400, 1800, 5680]
      ),
      S.p('Suggested sprint cadence: 2-week sprints. Demo cadence: weekly status email + bi-weekly review call (per SoW Clause 9).'),

      S.h2('6. HOUSE RULES (NON-NEGOTIABLE)'),
      S.p('From CLAUDE.md Section 12. Do not deviate without checking with the project lead.'),
      S.bullet('Never reintroduce Phase 2 features into Phase 1. Reports stay view-only with plain PDF/CSV. No letterhead PDF. No date-format standardisation. No payroll. No leave management. Aadhaar field validation is Phase 2; capture is Phase 1 (masked).'),
      S.bullet('Hours are source of truth. Never let a day-based calc sneak in. Always compute hours first, derive days last using the standard divisor of 9.5.'),
      S.bullet('Dual view at the QUERY layer, not the table layer. ONE attendance collection. The viewMode tag on the request determines which fields the API returns. No duplication of attendance records.'),
      S.bullet('Smart Anchor MUST be deterministic. Same (employeeId, date, alternateShift, realEntry, realExit) always produces the same (compliantEntry, compliantExit). Tests guard this.'),
      S.bullet('Timezone: Asia/Kolkata everywhere. Store UTC, display IST. Use date-fns-tz.'),
      S.bullet('Validate PAN + IFSC. Skip Aadhaar checksum validation in Phase 1.'),
      S.bullet('Audit log is immutable. Adjustments create new records, never mutate. The MongoDB application user has insert+find permissions only on attendance_raw, adjustments, audit_log, and unmask_audit.'),
      S.bullet('Sensitive fields masked by default, role-gated unmask, every unmask logged in unmask_audit.'),
      S.bullet('On-prem only. No cloud services at runtime. No Auth0, Sentry, S3, Mixpanel, SaaS auth, nothing. Zero outbound dependencies in production.'),
      S.bullet('Run npm run validate before every commit (typecheck + lint + tests).'),

      S.h2('7. OPEN QUESTIONS FOR THE PROJECT LEAD'),
      S.dataTable(
        ['#', 'Question', 'Why it matters'],
        [
          ['1', 'Confirmed list of factory locations + employee counts per location', 'Sizing the eSSL device count for M2'],
          ['2', 'Brand assets (Makson logo, favicon) - when will Client deliver?', 'Per SoW §12, Week 2. Block on this for branding.'],
          ['3', 'Replacement plan for non-eSSL legacy devices (Hanvon F710)', 'Per SoW §12, Client cost. Need timeline from Komal.'],
          ['4', 'Network reachability between factory locations and on-prem server', 'Critical for ADMS push. ~100K record offline buffer is the safety margin.'],
          ['5', 'Static IP / DNS for the on-prem server', 'Devices need a stable target.'],
          ['6', 'Approval / definition of compliance shifts', 'SAD assumes A=06-14, B=14-22, C=22-06 IST. Confirm with Komal.'],
          ['7', 'UAT participants and schedule', 'Need 3-5 HR users at Surendranagar for M4.'],
        ],
        [500, 5500, 6080]
      ),

      S.h2('8. COMMUNICATION & ESCALATION'),
      S.dataTable(
        ['Role', 'Person', 'Contact'],
        [
          ['Project Lead / Infoloop SPOC', 'Mr. Nimit Kaneria', 'Nimit.Kaneria@infoloop.co · +91 97261 81000'],
          ['Executive Sponsor (Infoloop)', 'Mr. Nimit Kaneria (CEO)', 'as above'],
          ['Tech Lead (Infoloop)', 'Mr. Prem Mehta', 'introduced via Project Lead'],
          ['Client SPOC', 'Mrs. Komal Makasana (CFO & Partner)', 'introduced via Project Lead'],
          ['Client Executive Sponsor', 'Mr. Kalpesh Makasana (Director)', 'introduced via Project Lead'],
        ],
        [3500, 3500, 5080]
      ),
      S.p('Escalation path: Engineer → Prem Mehta (Tech Lead) → Nimit Kaneria (Project Lead) → Executive Sponsor.'),
      S.h3('8.1 Tools'),
      S.bullet('Microsoft Teams for all team chat. Channels: #mams-dev, #mams-bugs, #mams-deploy (or whatever Prem sets up - confirm channel names on Day 1).'),
      S.bullet('Asana for sprint backlog and ticket tracking.'),
      S.bullet('Email to the Client only via Project Lead - engineers never email Komal directly without Nimit awareness.'),
      S.h3('8.2 Cadence'),
      S.bullet('Daily async standup in Teams #mams-dev (15 min, 9:30 AM IST, threaded).'),
      S.bullet('Weekly status email to Komal (Project Lead writes - engineers contribute one-liners).'),
      S.bullet('Bi-weekly Client review call (Project Lead + Tech Lead attend; engineers may be invited for technical demos).'),
      S.bullet('Engineers should never email or message the Client directly without Project Lead awareness.'),

      S.h2('9. PRE-KICKOFF CHECKLIST'),
      S.p('Things to do before writing your first line of MAMS code on Wednesday 29 April:'),
      S.bullet('Read all four documents in §2 reading order.'),
      S.bullet('Working local environment (per Quick Start §3); seeded DB; both dev servers up; can log in as both hr.admin and hr.compliance.'),
      S.bullet('Initialise the Git repo from this ZIP - the team owns the initial commit. Run git init, add a .gitignore-respecting initial commit, push to the Infoloop Git host, configure branch protection on main. The ZIP is delivered without .git history.'),
      S.bullet('Confirmed access to Microsoft Teams channels (#mams-dev, #mams-bugs, #mams-deploy - Prem will confirm names).'),
      S.bullet('Confirmed access to the Asana project / workspace.'),
      S.bullet('You can run npm run validate and it passes.'),
      S.bullet('You have read the approved mockup and clicked through every screen.'),
      S.bullet('You have skim-read legal SoW v2 Clauses 2, 3, 5, 6, 7, 8, 11.'),

      S.h2('10. DAY 1 TASK IDEAS'),
      S.p('Small things to ship on Day 1 to learn the codebase. Pick one, open a PR, get it merged, then start real work:'),
      S.bullet('Add a CSV employee-import endpoint stub (POST /api/employees/import-csv) returning 501. Wire up an "Import CSV" button on Employees page.'),
      S.bullet('Add a /health ping in the web header that calls GET /api/health every 30s and shows a green/red dot.'),
      S.bullet('Write one Vitest unit test for the masking helper at mams/mams-server/src/utils/mask.ts.'),
      S.bullet('Read the Sidebar component and add a small "Build version" footer using import.meta.env.VITE_APP_VERSION.'),

      S.spacer(280),
      S.callout(
        'CLOSING NOTE',
        'The scaffold is intentionally not 100% complete. It is a foundation that proves end-to-end correctness for the hardest parts (auth, dual-credential view, eSSL receiver, Smart Anchor v2, sensitive-field masking) and leaves the workflow-heavy modules (Adjustments, Reports, Devices admin, Settings) for the team. Read carefully. Run the scaffold. Click through the mockup. Then write code. Welcome aboard.',
        S.COLORS.accentDark
      ),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'tech', '00_Developer_Handoff.docx'), buf);
  console.log('Developer Handoff DOCX created');
});
