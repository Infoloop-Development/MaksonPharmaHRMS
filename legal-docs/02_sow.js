const fs = require('fs');
const { Document, Packer } = require('docx');
const S = require('./_shared.js');

const doc = new Document({
  styles: S.styles, numbering: S.numbering,
  sections: [{
    properties: { page: S.PAGE },
    headers: { default: S.buildHeader('Statement of Work — MAMS') },
    footers: { default: S.buildFooter() },
    children: [
      ...S.titleBlock('STATEMENT OF WORK', 'Annexure A to Master Services Agreement dated 29 April 2026'),

      S.kvTable([
        ['SoW Reference', 'ITL/SOW/MAKSON/2026-04-001'],
        ['Project Name', 'Makson Attendance Management System (MAMS)'],
        ['Service Provider', 'Infoloop Technologies LLP'],
        ['Client', 'Makson Pharmaceuticals (India) Pvt. Ltd.'],
        ['Effective Date', '29 April 2026'],
        ['Estimated Duration', '8 to 10 weeks'],
        ['Total Fees', 'INR 7,50,000/- + GST'],
        ['Document Version', 'v2 (revised post-review by Client)'],
      ]),
      S.spacer(280),

      S.h2('1. PROJECT OBJECTIVE'),
      S.p('To design, develop, deploy, and hand over a custom Attendance Management System (MAMS) for Makson Pharmaceuticals (India) Private Limited that:'),
      S.bullet('Captures real-time attendance data from biometric devices across all factory locations.'),
      S.bullet('Maintains parallel internal (real) and compliance (regulatory) views of attendance through a dual-credential architecture.'),
      S.bullet('Generates labour-law-compliant reports for inspection by government authorities.'),
      S.bullet('Provides comprehensive employee master, device monitoring, attendance log, adjustments workflow, and reporting modules.'),
      S.bullet('Captures hours-based attendance data architected to support a future Phase 2 payroll module.'),

      S.h2('2. SCOPE OF DELIVERABLES'),

      S.h3('2.1 Authentication & Access'),
      S.bullet('Dual-credential login system (internal user / compliance auditor) with identical UI but differentiated data view.'),
      S.bullet('Role-based access control with audit logging.'),
      S.bullet('Password policy enforcement and session management.'),

      S.h3('2.2 Employee Master Module'),
      S.bullet('Full CRUD operations for employee records.'),
      S.bullet('Fields: ID, name, gender, department, designation, location, time shift, alternate (compliance) time shift, weekly off (multi-day), date of joining, biometric ID, PAN, Aadhaar, bank account details, PF number, ESI number.'),
      S.bullet('Field-level validation as per Indian regulatory formats (PAN, IFSC).'),
      S.bullet('Sensitive-field protection (data minimisation by access): Aadhaar, PAN, bank account number, PF number, and ESI number are stored to support the engagement and future statutory needs, but are masked by default in all UI views (e.g., XXXXXXXX1234). Unmasking shall require an explicit user action, be restricted to authorised roles with appropriate permission, and shall create an immutable audit-log entry recording the user, timestamp, IP address, and field accessed. Aadhaar format / checksum validation is deferred to Phase 2 as set out in Clause 3.'),
      S.bullet('Bulk CSV import of employee records using a published Infoloop template. Infoloop validates incoming records against the template format; any duplicates, invalid values, missing fields, or inconsistencies will be flagged in an import report. Resolution of such data discrepancies is the Client’s obligation — Infoloop does not undertake source-data cleansing.'),
      S.bullet('Active / inactive status management.'),
      S.bullet('Search, filter, sort, and pagination.'),

      S.h3('2.3 Attendance Capture'),
      S.bullet('Integration with eSSL biometric devices via Push Data Technology (ADMS protocol).'),
      S.bullet('Real-time punch capture with timestamp, device ID, and employee mapping.'),
      S.bullet('Original biometric punch records (raw timestamps received from devices) are immutable. Such records shall never be deleted, edited, or overwritten by any user, role, or process. All corrections and shift-mapping outputs are stored as separate, additional records that reference the original punch.'),
      S.bullet('Smart Anchor v2 engine for compliance punch generation within the assigned 8-hour window. Smart Anchor outputs are derived records; the original raw punch remains untouched and viewable.'),
      S.bullet('Hours decomposition: gross hours, break minutes, net hours, compliant hours, OT hours.'),
      S.bullet('Day type classification (Working / Weekly Off / Absent).'),
      S.bullet('Live attendance log dashboard.'),

      S.h3('2.4 Attendance Adjustments Module'),
      S.bullet('HR-initiated adjustment requests for syncing compliance data with reality.'),
      S.bullet('Mandatory fields: employee, dates, reason, justification, supporting evidence, salary impact note.'),
      S.bullet('Approval workflow with single and bulk approve / reject capability. Every adjustment requires explicit user approval; no automatic or time-based auto-approval is permitted.'),
      S.bullet('Immutable audit trail: every correction is recorded as a new entry capturing the previous value, the new value, the reason, the user who initiated the change, the user who approved or rejected it, the timestamp, and the IP address. The original record remains visible alongside the correction.'),
      S.bullet('Status tracking (Pending / Approved / Rejected) with full history.'),

      S.h3('2.5 Reports Module'),
      S.bullet('Daily Attendance Report with date range filtering.'),
      S.bullet('Monthly Summary Report.'),
      S.bullet('Department-wise Report.'),
      S.bullet('Location-wise Report.'),
      S.bullet('On-screen viewing of all reports with filter, sort, and pagination.'),
      S.bullet('Export to plain PDF (browser-rendered print-to-PDF, without enterprise letterhead or compliance header block).'),
      S.bullet('Export to CSV for offline analysis or downstream payroll processing.'),

      S.h3('2.6 Devices Module'),
      S.bullet('Device registry with online / offline status monitoring.'),
      S.bullet('Per-device sync controls and global Sync All capability.'),
      S.bullet('Last-sync timestamps and 100K transaction offline buffer awareness.'),

      S.h3('2.7 Settings Module'),
      S.bullet('Company compliance information (CIN, GSTIN, PF, ESI, Factory Licence, address, signatory).'),
      S.bullet('Company-wide weekly off default.'),
      S.bullet('Time shifts configuration (actual 12-hour and compliance 8-hour).'),
      S.bullet('Smart Anchor configuration (toggle, offset range).'),
      S.bullet('User management with add / edit capability.'),
      S.bullet('Confidentiality notice toggle and editor.'),

      S.h3('2.8 Documentation & Training'),
      S.bullet('User Manual (HR Admin, Compliance Auditor).'),
      S.bullet('Admin Setup Guide.'),
      S.bullet('System Architecture Document.'),
      S.bullet('Source Code with inline documentation.'),
      S.bullet('One online training session (up to 2 hours) for HR team and IT administrator.'),

      S.h2('3. OUT OF SCOPE'),
      S.p('The following are explicitly excluded from Phase 1 and shall be addressed under separate engagements if required:'),
      S.bullet('Payroll calculation, salary processing, and disbursement.'),
      S.bullet('PF / ESI / PT statutory return generation and filing.'),
      S.bullet('TDS calculation and Form 16 generation.'),
      S.bullet('Leave management module (CL/SL/PL balances, leave application workflow).'),
      S.bullet('Mobile applications (iOS/Android) — desktop-responsive web only.'),
      S.bullet('Integration with third-party HRMS, ERP, or accounting systems.'),
      S.bullet('Migration of historical attendance data from legacy systems (employee master CSV import is included; historical punch / attendance migration is not).'),
      S.bullet('Hardware procurement (biometric devices, servers, network equipment).'),
      S.bullet('Replacement of incompatible legacy biometric devices (Client responsibility).'),
      S.bullet('Customisation of biometric device firmware or third-party SDKs.'),
      S.bullet('SMS/WhatsApp/email notification systems.'),
      S.bullet('Multi-language UI (English only in Phase 1).'),
      S.bullet('Cloud hosting (system shall be deployed on the Client’s on-premise server; cloud / SaaS hosting is excluded).'),
      S.bullet('Aadhaar number format / checksum validation — deferred to Phase 2. The Aadhaar field IS captured in Phase 1 but is masked by default and accessible only to authorised roles with appropriate permission; format validation against UIDAI specifications is deferred.'),
      S.bullet('Enterprise letterhead PDF with full compliance details (CIN, GSTIN, PF, ESI, Factory Licence, signatory block, confidentiality notice) — deferred to Phase 2. Plain PDF export of reports IS included in Phase 1.'),
      S.bullet('Indian date format (DD/MM/YYYY) standardisation across all exports — in-app display follows DD/MM/YYYY by default; export-level standardisation deferred to Phase 2.'),
      S.bullet('Brand assets management (in-app upload of logo, favicon, page title) — deferred to Phase 2; in Phase 1, branding will be configured during initial deployment by the Service Provider.'),

      S.h2('4. PROJECT TIMELINE'),
      S.p('The following milestone schedule is indicative and assumes timely Client inputs and approvals.'),
      S.spacer(80),
      S.dataTable(
        ['Phase', 'Deliverable', 'Duration', 'Cumulative'],
        [
          ['Week 1', 'Kickoff, requirements freeze, environment setup, eSSL device compatibility validation', '1 week', 'Week 1'],
          ['Week 2-3', 'Database schema, authentication, employee master, CSV import utility', '2 weeks', 'Week 3'],
          ['Week 4-5', 'Biometric integration, Smart Anchor engine, attendance capture, first device live', '2 weeks', 'Week 5'],
          ['Week 6', 'Adjustments module, approval workflow, audit trail', '1 week', 'Week 6'],
          ['Week 7', 'Reports module (view + plain PDF + CSV export), devices module', '1 week', 'Week 7'],
          ['Week 8', 'Settings, sensitive-field masking, polish, internal QA', '1 week', 'Week 8'],
          ['Week 9', 'UAT at Surendranagar, bug fixes, documentation', '1 week', 'Week 9'],
          ['Week 10', 'Training, deployment to Client on-prem server, source code + credentials handover, sign-off', '1 week', 'Week 10'],
        ],
        [1500, 4500, 1900, 2180]
      ),

      S.h2('5. PAYMENT MILESTONES'),
      S.p('The total project fee of INR 7,50,000/- (plus GST at the prevailing rate) shall be released against verifiable, demonstrable milestones. Each milestone after M1 requires explicit written acceptance from an authorised Client representative before the corresponding invoice is raised.'),
      S.spacer(80),
      S.dataTable(
        ['#', 'Milestone & Trigger', '%', 'Amount (INR)'],
        [
          ['M1', 'Kickoff: signed MSA + SoW + NDA + DPA received by Service Provider.', '50%', '3,75,000'],
          ['M2', 'Device Connection Verified: at least one eSSL device at Surendranagar HQ successfully pushing live punches into MAMS dev environment, demonstrated to Client, and accepted in writing by Client.', '15%', '1,12,500'],
          ['M3', 'Build Complete & Internal QA Passed: all Phase 1 modules built (Auth, Employee Master with CSV import, Attendance, Adjustments, Reports with PDF/CSV export, Devices, Settings); Smart Anchor v2 unit tests passing; internal QA report shared; demonstrated to Client and accepted in writing.', '15%', '1,12,500'],
          ['M4', 'UAT Passed & Errors Fixed: UAT cycle completed at Surendranagar HQ; all Severity-1 and Severity-2 defects closed; eSSL devices integrated across all five operational locations; UAT sign-off issued in writing by Client.', '10%', '75,000'],
          ['M5', 'Final Handover & Sign-off: deployment complete on Client on-premise server; training delivered; full source code, documentation, database admin credentials, and application admin credentials transferred to Client; final written sign-off issued by Client.', '10%', '75,000'],
        ],
        [600, 7480, 800, 1200]
      ),
      S.spacer(120),
      S.p('GST at the applicable rate (currently 18%) shall be charged additionally on the corresponding Tax Invoice raised after each milestone is accepted in writing. Each invoice is payable within seven (7) business days from invoice date. Late payment beyond fifteen (15) days from invoice date shall attract simple interest at 1.5% per month.'),

      S.h2('6. ACCEPTANCE CRITERIA'),
      S.p('Each milestone deliverable shall be accepted only upon: (a) live demonstration by the Service Provider to the Client; (b) provision of supporting test reports / evidence as applicable; (c) explicit written sign-off from an authorised Client representative confirming acceptance.'),
      S.p('There shall be no automatic, deemed, or time-elapsed acceptance. A milestone is not deemed accepted until written acceptance is received from the Client.'),
      S.p('To prevent indefinite project stall, the following escalation path applies if Client review is delayed beyond ten (10) business days from the date of demonstration without specific feedback:'),
      S.bullet('Day 11: Service Provider sends a written reminder to the Client Project Manager.'),
      S.bullet('Day 16: Service Provider escalates in writing to the Executive Sponsor (Mr. Kalpesh Makasana, Director).'),
      S.bullet('Day 21: A joint review call shall be convened to either issue acceptance, raise specific defects, or agree a revised review window.'),
      S.p('Where the Client raises specific defects within the review window, the Service Provider shall address them and resubmit the deliverable for fresh acceptance review.'),

      S.h2('7. CHANGE MANAGEMENT'),
      S.p('No change to the scope, deliverables, fees, or timeline of this SoW shall take effect, and no additional work shall be undertaken or charged for, except through a written Change Request signed by authorised representatives of both Parties.'),
      S.bullet('Either Party may propose a Change Request at any time.'),
      S.bullet('The Service Provider shall, within five (5) business days of receiving a Change Request, provide a written impact assessment covering effort, fees, timeline, and any dependencies.'),
      S.bullet('The Change Request shall take effect only when countersigned by an authorised Client representative.'),
      S.bullet('No additional fees shall be billed, and no out-of-scope work shall be performed, on the basis of verbal instructions, email exchanges, or implied agreement. Written, signed Change Requests are the sole authority for scope changes.'),

      S.h2('8. SERVICE LEVELS & POST-DEPLOYMENT SUPPORT'),
      S.p('The following service levels apply during the warranty / free-support period of three (3) months from Final Acceptance (M5), and may be extended through an Annual Maintenance Contract (AMC) on terms to be mutually agreed.'),

      S.h3('8.1 Severity Definitions and SLA'),
      S.spacer(80),
      S.dataTable(
        ['Severity', 'Definition', 'Response Time', 'Resolution Target'],
        [
          ['P1 — Critical', 'System down; attendance capture not functioning; users unable to log in; data integrity issue affecting compliance reporting.', 'Within 2 hours', 'Same business day or next business day'],
          ['P2 — High', 'A core module (e.g., Adjustments, Reports, Devices) is broken or unusable but other modules function; one or more devices not syncing.', 'Within 4 business hours', 'Within 2 business days'],
          ['P3 — Medium', 'A defect with a workaround exists; cosmetic or minor functional issue not blocking operations.', 'Within 1 business day', 'Within 5 business days'],
          ['P4 — Low', 'Cosmetic, documentation, or enhancement request that is in-scope.', 'Within 2 business days', 'Best effort, scheduled in next maintenance window'],
        ],
        [1700, 4900, 1900, 1580]
      ),

      S.h3('8.2 Support Hours'),
      S.bullet('Standard support: Monday to Friday, 9:00 AM to 7:00 PM India Standard Time, excluding declared public holidays.'),
      S.bullet('P1 (Critical) issues: 24x7 telephone / email response during the warranty period; resolution best-effort outside standard hours.'),
      S.bullet('Support channels: dedicated email address, telephone hotline (during business hours), and ticketing portal.'),

      S.h3('8.3 Post-Warranty / Post-Exit Support'),
      S.bullet('At the end of the three-month warranty period, the Parties may enter into an Annual Maintenance Contract (AMC) at terms to be mutually agreed in writing. Indicative AMC scope: bug fixes, OS / runtime / dependency security patches, periodic health checks, and minor enhancements.'),
      S.bullet('If no AMC is entered into, the Service Provider shall remain available on a paid time-and-materials basis at hourly rates separately agreed in writing, for a minimum period of twelve (12) months from Final Acceptance.'),
      S.bullet('Knowledge-transfer support: for ninety (90) days following Final Acceptance, the Service Provider shall respond to clarification queries from the Client’s nominated administrator (architecture, deployment, runtime configuration) at no additional charge, capped at ten (10) hours of consultative time.'),

      S.h2('9. PROJECT GOVERNANCE'),
      S.spacer(80),
      S.dataTable(
        ['Role', 'Infoloop', 'Makson'],
        [
          ['Executive Sponsor', 'Mr. Nimit Kaneria (CEO)', 'Mr. Kalpesh Makasana (Director)'],
          ['Project Manager / SPOC', 'Mr. Nimit Kaneria', 'Mrs. Komal Makasana'],
          ['Communication Cadence', 'Weekly status updates by email', 'Bi-weekly review calls'],
          ['Issue Escalation Path', 'Project Manager → Executive Sponsor', 'Project Manager → Executive Sponsor'],
        ],
        [2700, 3600, 3780]
      ),

      S.h2('10. TECHNOLOGY STACK & DEPLOYMENT'),
      S.bullet('Built on the MERN stack: MongoDB (database), Express.js (API framework), React (frontend), Node.js (backend runtime).'),
      S.bullet('Deployed on the Client’s on-premise server provided and maintained by the Client.'),
      S.bullet('Server provisioning, OS hardening, network configuration, and physical security are the Client’s responsibility.'),
      S.bullet('Service Provider shall install all required runtime components (Node.js, MongoDB, PM2, Nginx reverse proxy) and configure the application on the on-premise server.'),
      S.bullet('Source-code and credentials handover: upon Final Acceptance (M5), the Service Provider shall hand over to the Client (a) the complete source code via Git repository transfer or USB transfer at Client’s preference; (b) database administrative credentials; (c) application administrative credentials; (d) all environment configuration files; (e) deployment scripts and runbooks. Following handover, the Client controls all credentials and may rotate them at any time.'),
      S.bullet('Three (3) months free post-deployment support included as defined in Clause 8.'),
      S.bullet('Optional Annual Maintenance Contract (AMC) at separately agreed terms.'),

      S.h2('11. DATA OWNERSHIP & USE RESTRICTIONS'),
      S.bullet('All data captured, stored, generated, or processed by MAMS — including but not limited to employee personal data, biometric records, attendance logs, adjustment history, audit trails, and any derived analytics — is the exclusive property of the Client.'),
      S.bullet('The Service Provider shall not use, copy, extract, transmit, anonymise, aggregate, or retain any Client data for any purpose other than performing the services under this SoW and the MSA.'),
      S.bullet('The Service Provider shall not use any Client data, screenshots derived from Client data, or any artefacts containing Client data for product demonstrations, marketing materials, case studies, sales pitches, training datasets, or any external presentation — except with prior, specific, written consent of the Client.'),
      S.bullet('Generic references to the engagement (e.g., “Infoloop has delivered an attendance management system to a pharmaceutical manufacturer”) without disclosure of the Client’s name, brand, employee data, or screenshots, may be made only with prior written approval as per MSA Clause 7.4.'),
      S.bullet('On termination of the engagement or on Client request, the Service Provider shall return or securely destroy all copies of Client data within thirty (30) days as per the Data Processing Agreement.'),

      S.h2('12. ASSUMPTIONS, DEPENDENCIES & DEVICE COMPATIBILITY'),
      S.bullet('Client shall provide a single point of contact authorised to make decisions.'),
      S.bullet('Client shall provide an on-premise server meeting the minimum specifications shared by the Service Provider (Linux OS, minimum 8 GB RAM, 250 GB SSD, static IP, regular automated backups), with administrative access for installation and configuration.'),
      S.bullet('Client shall ensure the on-premise server has stable power, network connectivity, and is reachable from all factory locations where biometric devices are installed.'),
      S.bullet('Client shall ensure biometric devices are operational and configured to push data to the on-premise server.'),
      S.bullet('Device compatibility validation window: within the first two (2) weeks of the engagement, the Service Provider shall validate that the eSSL device models nominated by the Client successfully push data into MAMS. The eSSL SilkBio-101TC has already been tested and confirmed compatible.'),
      S.bullet('If a nominated eSSL device model is found incompatible during the validation window, the Parties shall jointly determine the cause: (a) if the cause is firmware or device-side configuration, the Service Provider shall reasonably attempt resolution and, where required, escalate to the device OEM, with no additional fees; (b) if resolution requires Client to replace the unit with a compatible eSSL model, replacement is at Client cost (consistent with the existing position on legacy non-eSSL devices); (c) if compatibility cannot be achieved despite best efforts and the device family is fundamentally incompatible, this shall be raised as a Change Request with a re-scoped integration approach.'),
      S.bullet('Non-eSSL legacy biometric devices (e.g., Hanvon FaceID F710) found incompatible shall be replaced by Client at Client cost, consistent with the existing engagement assumption.'),
      S.bullet('Client shall be responsible for server maintenance, OS patches, backups, and disaster recovery after handover.'),
      S.bullet('Client shall provide a complete and accurate list of employees, factory locations, and shift configurations within the first week. Where bulk import via CSV is used, data correctness in the source file remains the Client’s responsibility.'),
      S.bullet('Client shall provide brand assets (logo, favicon) and compliance details (CIN, GSTIN, PF, ESI, Factory Licence) within the first two weeks for deployment-time configuration.'),
      S.bullet('Client review and acceptance shall be provided in line with Clause 6; Client-side delays may proportionally extend the timeline.'),

      S.spacer(360),
      S.p('Signed in token of acceptance:', { bold: true }),
      S.spacer(280),
      S.esignNote(),
      S.signatureBlock(
        'For INFOLOOP TECHNOLOGIES LLP', 'Mr. Nimit Kaneria', 'Designated Partner & CEO',
        'For MAKSON PHARMACEUTICALS (INDIA) PRIVATE LIMITED', 'Mrs. Komal Makasana', 'CFO & Partner'
      ),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(require('path').join(__dirname, '..', 'final-docs', 'v2', '02_Statement_of_Work.docx'), buf);
  console.log('SoW v2 created');
});
