const fs = require('fs');
const path = require('path');
const { Document, Packer } = require('docx');
const S = require('./_shared.js');

const doc = new Document({
  styles: S.styles, numbering: S.numbering,
  sections: [{
    properties: { page: S.PAGE },
    headers: { default: S.buildHeader('System Architecture Document') },
    footers: { default: S.buildFooter() },
    children: [
      ...S.titleBlock('SYSTEM ARCHITECTURE DOCUMENT', 'MAMS - Makson Attendance Management System (Phase 1)'),

      S.kvTable([
        ['Document', 'System Architecture Document (SAD)'],
        ['Project', 'Makson Attendance Management System (MAMS)'],
        ['Audience', 'Infoloop development team; Makson IT administrator at handover'],
        ['Document Owner', 'Tech Lead, Infoloop Technologies LLP'],
        ['Version', 'v1 - 30 April 2026'],
        ['Status', 'Internal - Confidential'],
      ]),
      S.spacer(280),

      S.mockupCallout(),
      S.spacer(280),

      S.h2('1. PURPOSE'),
      S.p('This document is the canonical architecture reference for the MAMS Phase 1 build. It captures the system shape, key technical decisions and their rationale, the data flow for each major workflow, and the security and compliance posture. It is the single source of truth that engineers, the QA function, and the eventual Makson IT administrator should consult to understand how MAMS is put together.'),
      S.p('This SAD is also a contractual deliverable to Makson at handover (M5). It is maintained as a living document during the build phase and frozen at handover.'),

      S.h2('2. SYSTEM CONTEXT'),
      S.p('MAMS replaces a manual attendance + compliance reporting workflow at Makson Pharmaceuticals (India) Pvt. Ltd. The platform supports approximately 1,800 employees across six factory locations, capturing biometric punches in real time and producing two parallel views of the same data: an internal "real" view (12-hour shifts as actually worked) and a labour-law-compliant view (8-hour shift representation).'),
      S.p('The system is deployed entirely on Makson’s on-premise Linux server. There are no cloud dependencies in the production runtime: no SaaS auth, no analytics SDKs, no third-party error reporting, no external storage.'),

      S.h3('2.1 External Actors'),
      S.dataTable(
        ['Actor', 'Role', 'Interaction with MAMS'],
        [
          ['HR Admin', 'Internal Makson HR personnel', 'Authenticates with hr.admin credential; manages employees, attendance, adjustments; sees real-hours view'],
          ['Compliance Auditor', 'Government / internal labour-law auditor', 'Authenticates with hr.compliance credential; sees compliant 8-hour view; generates reports for inspection'],
          ['Makson IT Administrator', 'On-prem server operator', 'Maintains server, applies OS patches, manages backups, restarts services; full SSH access'],
          ['eSSL Biometric Devices', 'Physical units across factory floors', 'Push punch records via ADMS protocol to MAMS webhook endpoint'],
          ['Employees', 'Subjects of attendance data', 'Punch in/out at biometric devices; have data subject rights (access, correction) exercised through HR Admin'],
        ],
        [2200, 3500, 4380]
      ),

      S.h2('3. ARCHITECTURE OVERVIEW'),
      S.p('MAMS is a three-tier MERN application running entirely on a single on-premise Linux server. The high-level component layout is:'),
      S.spacer(80),
      S.codeBlock(`+----------------------------------------------------------------+
|                  MAKSON ON-PREMISE SERVER                       |
|                                                                  |
|  +------------+    +-------------+    +-------------------+      |
|  |  Browser   |--->|   Nginx     |--->|  mams-server      |      |
|  | (HR Admin /|    |  :443 HTTPS |    | Express + TS      |      |
|  | Compliance)|    |  reverse    |    | :3001 internal    |      |
|  +------------+    |  proxy      |    +---------+---------+      |
|                    +------+------+              |                |
|                           |                     |                |
|  +------------+           v                     v                |
|  |  eSSL      |     +---------------+    +-------------+         |
|  |  Devices   |---->|  mams-server  |    |  MongoDB    |         |
|  | (push      |     |  /api/        |    |  :27017     |         |
|  |  ADMS)     |     |  attendance/  |    | (local)     |         |
|  +------------+     |  push         |    +-------------+         |
|                     +---------------+                            |
|                                                                  |
|  PM2 supervises mams-server. Logs to /var/log/mams/.            |
|  Daily MongoDB snapshot via Client cron to /backup/mams-mongo/. |
+------------------------------------------------------------------+`),
      S.spacer(120),

      S.h3('3.1 Tier breakdown'),
      S.dataTable(
        ['Tier', 'Component', 'Tech', 'Role'],
        [
          ['Presentation', 'mams-web', 'React 18 + TypeScript + Vite + Tailwind CSS', 'Single-page app served as static assets through Nginx; routes for HR Admin and Compliance Auditor flows'],
          ['Application', 'mams-server', 'Node.js 20 + Express.js + TypeScript', 'REST API; eSSL push webhook; Smart Anchor v2 engine; auth + audit log; report generators'],
          ['Data', 'MongoDB 7', 'Mongoose ODM with Zod validation at API boundary', 'Single instance, local socket; collections for users, employees, attendance_raw, attendance_derived, adjustments, devices, settings, audit_log'],
          ['Edge', 'Nginx', 'Reverse proxy + TLS termination', 'HTTPS on :443 with self-signed or letsencrypt cert (Client choice); proxies /api/* to mams-server :3001 and serves built mams-web at root'],
          ['Process supervisor', 'PM2', 'Node process manager', 'Restart on crash, log rotation, startup at boot'],
        ],
        [1700, 1900, 3500, 2980]
      ),

      S.h2('4. KEY ARCHITECTURAL DECISIONS'),

      S.h3('4.1 Dual-credential view at the QUERY layer (not table layer)'),
      S.p('There is exactly one attendance collection. The differentiation between "real" and "compliant" views is implemented by tagging each authenticated request with a viewMode based on the role of the logged-in user, then having the API layer choose which fields to return.'),
      S.bullet('hr.admin -> viewMode: "real" -> response includes realGrossHours, realNetHours, raw entry/exit timestamps.'),
      S.bullet('hr.compliance -> viewMode: "compliant" -> response includes compliantHours, Smart-Anchor-derived entry/exit timestamps within the assigned 8-hour window.'),
      S.p('Rationale: duplicating attendance into two tables would create reconciliation risk every time an adjustment is made. Having one record with both fields, masked at the query layer, means the database is always self-consistent and the dual-view becomes a presentation concern, not a data-integrity concern.'),

      S.h3('4.2 Immutability of raw biometric records'),
      S.p('Records pushed by eSSL devices land in the attendance_raw collection and are never deleted, edited, or overwritten. This is enforced at three layers:'),
      S.bullet('MongoDB role: the application user has only insert and find permissions on attendance_raw - no update, no delete.'),
      S.bullet('Mongoose pre-hooks: pre("updateOne"), pre("deleteOne"), pre("findOneAndUpdate") all throw on this collection.'),
      S.bullet('API surface: there is no PATCH /api/attendance/raw/:id and no DELETE /api/attendance/raw/:id route. They simply do not exist.'),
      S.p('All business-logic transformations (Smart Anchor output, hours decomposition, day-type classification) live in the attendance_derived collection. Each derived record carries a foreign key to the originating raw record.'),

      S.h3('4.3 Smart Anchor v2 - deterministic compliance punch generation'),
      S.p('The Smart Anchor engine takes a raw punch and produces a compliant punch that falls within the employee’s assigned 8-hour compliance window. The mapping is deterministic: same employee, same date, same raw punch, always produces the same compliant punch.'),
      S.p('Determinism is achieved with a Park-Miller (Lehmer) linear congruential PRNG seeded by hash(employeeId + YYYY-MM-DD). This is the same generator used in the approved mockup, ensuring v2 production output matches the mockup’s prototypal behaviour.'),
      S.p('Rationale: deterministic output makes audit reproducible. If a compliance auditor questions a timestamp, we can re-run the algorithm and produce the same value. If we used cryptographic randomness, every regeneration would produce a different timestamp and we would lose traceability.'),

      S.h3('4.4 Sensitive-field masking at the API and UI layers'),
      S.p('Five fields - Aadhaar, PAN, bank account number, PF number, ESI number - are stored unencrypted at the application level (the database itself is on an encrypted volume managed by Makson IT) but are masked by default in every response and every UI render. Unmasking is gated by an explicit role permission and produces an immutable audit-log entry on every access.'),
      S.p('Rationale: data minimisation by access (vs. by collection) lets the system carry the data needed for future statutory filings without exposing it gratuitously. Audit-logged unmask makes us defensible against a "who saw what when" query from a regulator or in a legal hold.'),

      S.h3('4.5 On-premise only - no cloud runtime dependencies'),
      S.p('The production runtime has zero outbound dependencies. No analytics, no error reporting SaaS, no cloud auth, no third-party storage. This is a non-negotiable requirement and aligns with Makson’s pharmaceutical compliance posture and DPDP Act data-localisation considerations.'),
      S.bullet('Approved external dependencies: open-source npm packages (used at build time only), eSSL device firmware (controlled by Makson).'),
      S.bullet('Disallowed at runtime: Sentry, Bugsnag, Google Analytics, Mixpanel, Auth0, Firebase, S3, Cloudinary, Resend, Twilio, anything similar.'),

      S.h2('5. DATA FLOWS'),

      S.h3('5.1 Authentication flow'),
      S.codeBlock(`Browser           Nginx             mams-server         MongoDB
   |                |                    |                  |
   |- POST /login ->|                    |                  |
   |                |- proxy /api/auth ->|                  |
   |                |                    |- find user ----->|
   |                |                    |<- user record ---|
   |                |                    | bcrypt compare   |
   |                |                    | sign JWT (15m)   |
   |                |                    | sign refresh(7d) |
   |                |                    |- audit_log+ ---->|
   |                |<- 200 + tokens ----|                  |
   |<-- response ---|                    |                  |
`),
      S.p('Tokens: access token JWT (HS256, 15 min, signed with secret from env) carries userId, role, viewMode. Refresh token (opaque, 7 days, rotated on use) is stored hashed in MongoDB.'),

      S.h3('5.2 Attendance push flow (eSSL -> MAMS)'),
      S.codeBlock(`eSSL device        Nginx             mams-server         MongoDB
     |               |                    |                  |
     |--POST punch-->|                    |                  |
     |               |--/api/attendance/  |                  |
     |               |     push --------->|                  |
     |               |                    | parse ADMS body  |
     |               |                    | resolve employee |
     |               |                    | by biometric ID  |
     |               |                    |- find emp ------>|
     |               |                    |<- emp record ----|
     |               |                    | INSERT raw ----->|
     |               |                    |- attendance_raw->|
     |               |                    | run Smart Anchor |
     |               |                    | INSERT derived ->|
     |               |                    |- attendance_     |
     |               |                    |     derived ---->|
     |               |<--200 OK ADMS ack--|                  |
     |<-- ACK -------|                    |                  |
`),
      S.p('No queue between Nginx and mams-server in Phase 1 - latency is acceptable for the punch volume. If volume justifies it later (Phase 2), insert a Redis stream between the webhook and the Smart Anchor pipeline.'),

      S.h3('5.3 Adjustment workflow'),
      S.p('When HR adjusts an attendance record, MAMS does NOT modify the original. Instead it creates a new entry in the adjustments collection that captures previousValue, newValue, reason, justification, evidenceRef, salaryImpactNote, initiatedBy, initiatedAt, initiatedFromIp. The record stays in pending state until an authorised approver explicitly approves or rejects. On approval, the adjustment is linked to the relevant attendance_derived record so reports reflect the corrected value while the audit trail remains intact.'),

      S.h3('5.4 Report generation'),
      S.p('Reports are generated server-side from attendance_derived joined with the latest approved adjustment per record. The viewMode of the requesting user determines which hour fields are projected. PDF export is browser-rendered (window.print() with a print-friendly stylesheet) - no server-side PDF library in Phase 1. CSV export is streamed from the server.'),

      S.h2('6. SECURITY ARCHITECTURE'),
      S.bullet('Transport: TLS 1.2+ on Nginx :443. Internal Nginx -> mams-server is HTTP on the loopback interface only.'),
      S.bullet('Authentication: bcrypt (cost factor 10) for password storage; HS256 JWT with 15-min access tokens; opaque refresh tokens stored hashed.'),
      S.bullet('Authorisation: role-based. Roles: hr.admin, hr.compliance, it.admin. Permissions: read.real, read.compliant, write.adjust, approve.adjust, unmask.sensitive, manage.users, manage.devices.'),
      S.bullet('Rate limiting: per-IP at Nginx layer (100 req/min general, 10 req/min on /login).'),
      S.bullet('Audit log: every login, every failed login, every sensitive-field unmask, every adjustment, every settings change. Append-only; no API to modify or delete entries.'),
      S.bullet('Lockout: 5 consecutive failed login attempts on the same account triggers a 15-minute lockout, recorded in audit log.'),
      S.bullet('Field-level masking: see Database Schema Reference document for the masking spec.'),
      S.bullet('Backup: daily MongoDB dump to /backup/mams-mongo/ via cron (Makson-managed). 30-day retention.'),
      S.bullet('Logs: application logs to /var/log/mams/server.log via PM2; rotated weekly by logrotate.'),

      S.h2('7. DEPLOYMENT TOPOLOGY'),
      S.p('Single-server deployment. No load balancer, no failover (Phase 1). Specs (Client-provided): Linux Ubuntu 22.04 LTS, 8 GB RAM, 250 GB SSD, static IP, automated backup.'),
      S.h3('7.1 Service layout'),
      S.dataTable(
        ['Service', 'Port', 'Bind', 'Purpose'],
        [
          ['Nginx', '443', '0.0.0.0', 'TLS termination + reverse proxy + static asset serving'],
          ['Nginx', '80', '0.0.0.0', 'Redirect to 443'],
          ['mams-server', '3001', '127.0.0.1', 'Express API; only reachable via Nginx'],
          ['MongoDB', '27017', '127.0.0.1', 'DB; only reachable from mams-server'],
          ['eSSL push endpoint', '443', '0.0.0.0', 'Same Nginx; routes /api/attendance/push to mams-server'],
        ],
        [2700, 1200, 1900, 4380]
      ),

      S.h3('7.2 Filesystem layout'),
      S.codeBlock(`/opt/mams/
  current/                     -> symlink to releases/<timestamp>
  releases/
    2026-06-21T1430/           # one folder per deploy
      mams-server/
        dist/
        node_modules/
        ecosystem.config.js
      mams-web/
        dist/                  # built static assets
  shared/
    .env                       # secrets (mode 600, owned by mams user)

/var/log/mams/
  server.log
  server-error.log

/backup/mams-mongo/            # nightly dumps, 30-day retention

/etc/nginx/sites-enabled/mams.conf
`),

      S.h2('8. NON-FUNCTIONAL TARGETS'),
      S.dataTable(
        ['Concern', 'Target'],
        [
          ['Initial page load (4G)', '< 2 s'],
          ['API median response', '< 300 ms'],
          ['API p95 response', '< 800 ms'],
          ['Live attendance log update lag', '< 5 s'],
          ['CSV export of 10K rows', '< 10 s'],
          ['Concurrent users supported', '50'],
          ['Browser support', 'Latest 2 versions of Chrome, Edge, Firefox, Safari'],
          ['Timezone', 'Asia/Kolkata for display; UTC at storage'],
          ['Lighthouse accessibility score (HR Admin app)', '> 90'],
        ],
        [4500, 7580]
      ),

      S.h2('9. RELATED DOCUMENTS'),
      S.bullet('Database Schema Reference - field-by-field collection spec.'),
      S.bullet('eSSL ADMS Protocol Cheat-sheet - device integration spec.'),
      S.bullet('Local Dev Setup Guide - onboarding for new team members.'),
      S.bullet('Development Scope of Work - functional and process scope (docs/development-scope.md).'),
      S.bullet('Approved mockup - https://makson-payroll-mockup.netlify.app'),

      S.spacer(280),
      S.callout(
        'CHANGE CONTROL',
        'This SAD is the source of truth. If implementation diverges from this document, either update the document or revert the divergence. Architectural drift is the primary cause of project failure at handover; we prevent it by treating any code that contradicts this SAD as a defect until either the code or the document is corrected.',
        S.COLORS.primaryDark
      ),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'tech', '01_System_Architecture_Document.docx'), buf);
  console.log('SAD created');
});
