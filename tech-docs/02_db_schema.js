const fs = require('fs');
const path = require('path');
const { Document, Packer } = require('docx');
const S = require('./_shared.js');

const doc = new Document({
  styles: S.styles, numbering: S.numbering,
  sections: [{
    properties: { page: S.PAGE },
    headers: { default: S.buildHeader('Database Schema Reference') },
    footers: { default: S.buildFooter() },
    children: [
      ...S.titleBlock('DATABASE SCHEMA REFERENCE', 'MAMS - MongoDB Collections, Fields, Indexes, and Validation'),

      S.kvTable([
        ['Document', 'Database Schema Reference'],
        ['Project', 'Makson Attendance Management System (MAMS)'],
        ['Database', 'MongoDB 7 with Mongoose ODM'],
        ['Audience', 'Backend developers, DBA, QA'],
        ['Owner', 'Tech Lead, Infoloop Technologies LLP'],
        ['Version', 'v1 - 30 April 2026'],
      ]),
      S.spacer(280),

      S.mockupCallout(),
      S.spacer(280),

      S.h2('1. CONVENTIONS'),
      S.bullet('Every collection has _id (ObjectId), createdAt (Date), updatedAt (Date) - managed by Mongoose timestamps.'),
      S.bullet('All timestamps are stored as UTC. Display conversion to Asia/Kolkata happens at the API layer.'),
      S.bullet('Soft delete: isDeleted: Boolean, deletedAt: Date. Default false. Append-only collections (attendance_raw, adjustments, audit_log) do NOT support soft delete.'),
      S.bullet('Validation lives in two places: Mongoose schema (database-level) and Zod schema in shared/types/ (API boundary). Zod is canonical; Mongoose mirrors it.'),
      S.bullet('Field naming: camelCase for application fields, snake_case avoided.'),
      S.bullet('References: ObjectId pointing at another collection’s _id, named <collection>Id (e.g., employeeId, deviceId).'),

      S.h2('2. COLLECTIONS OVERVIEW'),
      S.dataTable(
        ['Collection', 'Volume estimate', 'Mutability', 'Purpose'],
        [
          ['users', '~10', 'Mutable', 'MAMS application users (HR admin, compliance auditor, IT admin)'],
          ['employees', '~1,800', 'Mutable', 'Employee master records'],
          ['attendance_raw', '~1.3M / year', 'APPEND-ONLY', 'Original biometric punches received from eSSL devices'],
          ['attendance_derived', '~720K / year (1 per emp per day)', 'Mutable (replace, not edit)', 'Smart Anchor outputs, hours decomposition, day-type classification'],
          ['adjustments', '~5K / year', 'APPEND-ONLY', 'HR-initiated correction requests with approval workflow'],
          ['devices', '~10', 'Mutable', 'Biometric device registry'],
          ['settings', 'singleton', 'Mutable', 'Company config (compliance info, shifts, Smart Anchor toggle)'],
          ['audit_log', '~50K / year', 'APPEND-ONLY', 'All sensitive actions: logins, unmasks, adjustments, settings changes'],
          ['csv_imports', '~50 / year', 'Mutable', 'CSV import history with success/error counts per import'],
          ['unmask_audit', '~5K / year', 'APPEND-ONLY', 'Granular log of every sensitive-field unmask event'],
          ['refresh_tokens', '~30 active', 'Mutable', 'Hashed refresh tokens; rotated on use'],
        ],
        [2200, 2700, 2200, 3080]
      ),

      S.h2('3. COLLECTION: users'),
      S.h3('3.1 Schema'),
      S.codeBlock(`{
  _id: ObjectId,
  email: String,                  // unique, lowercase, indexed
  passwordHash: String,           // bcrypt cost 10
  name: String,
  role: String,                   // 'hr.admin' | 'hr.compliance' | 'it.admin'
  permissions: [String],          // ['unmask.sensitive', 'approve.adjust', ...]
  viewMode: String,               // 'real' | 'compliant' - derived from role
  isActive: Boolean,              // default: true
  failedLoginCount: Number,       // resets on success; lockout at 5
  lockedUntil: Date,              // null when not locked
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}`),
      S.h3('3.2 Indexes'),
      S.bullet('email: unique, ascending'),
      S.bullet('role: ascending'),
      S.h3('3.3 Validation'),
      S.bullet('email matches RFC 5322 simplified regex.'),
      S.bullet('role enum strictly enforced.'),
      S.bullet('viewMode enum: "real" for hr.admin and it.admin; "compliant" for hr.compliance. Set automatically on save.'),

      S.h2('4. COLLECTION: employees'),
      S.h3('4.1 Schema'),
      S.codeBlock(`{
  _id: ObjectId,
  empCode: String,                // 'MKS0001' - unique, indexed
  name: String,
  gender: String,                 // 'M' | 'F' | 'O'
  department: String,
  designation: String,
  location: String,               // factory location
  timeShift: String,              // 'Day' | 'Night' (12-hour real shift)
  alternateShift: String,         // 'A' | 'B' | 'C' (8-hour compliance shift)
  weeklyOff: [String],            // ['Sunday'] or ['Saturday', 'Sunday'] etc.
  joinDate: Date,
  biometricId: String,            // unique, indexed - links to eSSL device record

  // SENSITIVE - masked by default, role-gated unmask, audit-logged
  pan: String,                    // 10 chars, validated against PAN regex
  aadhaar: String,                // 12 digits, NOT validated in Phase 1
  bankAccountNumber: String,
  ifsc: String,                   // validated against IFSC regex
  accountHolderName: String,
  accountType: String,            // 'Savings' | 'Current' | 'Salary'
  bankName: String,
  pfNumber: String,
  esiNumber: String,

  status: String,                 // 'Active' | 'Inactive'
  isDeleted: Boolean,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}`),
      S.h3('4.2 Indexes'),
      S.bullet('empCode: unique, ascending'),
      S.bullet('biometricId: unique, ascending'),
      S.bullet('Compound: (department, location, status) - powers HR filter UI.'),
      S.bullet('Compound: (location, status) - powers location-wise reports.'),
      S.h3('4.3 Validation'),
      S.bullet('pan: regex /^[A-Z]{5}[0-9]{4}[A-Z]$/ at API layer.'),
      S.bullet('ifsc: regex /^[A-Z]{4}0[A-Z0-9]{6}$/ at API layer.'),
      S.bullet('aadhaar: stored verbatim, no Phase 1 format validation.'),
      S.bullet('weeklyOff: each element in {Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday}.'),
      S.h3('4.4 Sensitive-field handling'),
      S.p('When responses include employee records, the sensitive fields (pan, aadhaar, bankAccountNumber, pfNumber, esiNumber) are masked by default at the API layer. Format: show last 4 characters, mask the rest with X. The unmasked value is included in the response only when (a) the requesting user has the unmask.sensitive permission, AND (b) the request explicitly asks for unmasked content via a query parameter or dedicated endpoint. Each unmask is logged in the unmask_audit collection.'),

      S.h2('5. COLLECTION: attendance_raw  (APPEND-ONLY)'),
      S.h3('5.1 Schema'),
      S.codeBlock(`{
  _id: ObjectId,
  employeeId: ObjectId,           // ref: employees
  biometricId: String,            // denormalised for fast device lookup
  deviceId: ObjectId,             // ref: devices - which device received the punch
  punchType: String,              // 'IN' | 'OUT'
  rawTimestamp: Date,             // exact UTC timestamp from device
  rawDate: String,                // 'YYYY-MM-DD' in IST - for fast date-range queries
  rawPayload: Object,             // exact ADMS body received, kept for audit
  receivedAt: Date,               // server-side receipt timestamp
  sourceIp: String,               // device source IP
  createdAt: Date                 // == receivedAt
}`),
      S.h3('5.2 Indexes'),
      S.bullet('Compound: (employeeId, rawDate) - powers daily attendance queries.'),
      S.bullet('rawTimestamp: ascending - powers time-range queries.'),
      S.bullet('deviceId: ascending - powers device-level diagnostics.'),
      S.h3('5.3 Mutability constraints (CRITICAL)'),
      S.bullet('MongoDB application user has only insert and find privileges on this collection.'),
      S.bullet('Mongoose pre("updateOne"), pre("deleteOne"), pre("findOneAndUpdate") all throw on this collection.'),
      S.bullet('No PATCH or DELETE API route exists for this collection.'),
      S.bullet('Any change to a record’s effective interpretation goes through the adjustments collection - the raw record itself is permanent.'),

      S.h2('6. COLLECTION: attendance_derived'),
      S.p('One record per employee per date. Created/replaced when raw punches for the day are processed by the Smart Anchor pipeline. If new raw punches arrive after the derived record exists, the derived record is recomputed (replaced wholesale) but the previous derived state is captured in the recomputeHistory array for traceability.'),
      S.h3('6.1 Schema'),
      S.codeBlock(`{
  _id: ObjectId,
  employeeId: ObjectId,           // ref: employees
  date: String,                   // 'YYYY-MM-DD' in IST

  // From raw - for the dual-credential REAL view
  realEntryAt: Date,              // earliest IN punch UTC
  realExitAt: Date,               // latest OUT punch UTC
  realGrossHours: Number,         // (exit - entry) in hours
  realNetHours: Number,           // realGross - (breakMinutes/60)
  breakMinutes: Number,           // default 30, configurable per shift

  // Smart Anchor - for the COMPLIANT view
  compliantEntryAt: Date,         // within assigned 8-hr window
  compliantExitAt: Date,          // exactly 8 hours after compliantEntryAt
  compliantHours: Number,         // min(realNet, 9.5)

  // Derived
  otHours: Number,                // max(0, realNet - 9.5)
  dayType: String,                // 'Working' | 'Weekly Off' | 'Absent'
  status: String,                 // 'Present' | 'Absent' | 'Weekly Off' | 'Half Day'

  // Linkage
  rawRecordIds: [ObjectId],       // refs: attendance_raw
  appliedAdjustmentId: ObjectId,  // ref: adjustments - latest approved adjustment if any

  // Audit
  computedAt: Date,
  computedFromSmartAnchorVersion: String,  // 'v2.0.0'
  recomputeHistory: [{
    recomputedAt: Date,
    previousState: Object,
    reason: String                // 'late_punch_arrived' | 'manual_adjustment_applied' | etc.
  }],

  createdAt: Date,
  updatedAt: Date
}`),
      S.h3('6.2 Indexes'),
      S.bullet('Compound: (employeeId, date) - unique. Powers daily lookup and prevents duplicates.'),
      S.bullet('Compound: (date, dayType) - powers attendance summary reports.'),
      S.bullet('appliedAdjustmentId: ascending sparse - powers reconciliation queries.'),

      S.h2('7. COLLECTION: adjustments  (APPEND-ONLY)'),
      S.h3('7.1 Schema'),
      S.codeBlock(`{
  _id: ObjectId,
  employeeId: ObjectId,
  date: String,                   // 'YYYY-MM-DD' affected
  fieldChanged: String,           // 'realEntryAt' | 'realExitAt' | 'dayType' | etc.
  previousValue: Mixed,           // whatever the prior derived value was
  newValue: Mixed,                // requested new value
  reason: String,                 // structured: 'missed_punch' | 'wrong_device' | 'system_outage' | 'other'
  justification: String,          // free text - mandatory min 10 chars
  evidenceRef: String,            // file URL or document reference - mandatory
  salaryImpactNote: String,       // mandatory free text

  status: String,                 // 'Pending' | 'Approved' | 'Rejected'

  initiatedBy: ObjectId,          // ref: users
  initiatedAt: Date,
  initiatedFromIp: String,

  decidedBy: ObjectId,            // ref: users - null until approved/rejected
  decidedAt: Date,
  decidedFromIp: String,
  approverNote: String,

  createdAt: Date
}`),
      S.h3('7.2 Indexes'),
      S.bullet('Compound: (status, employeeId) - powers pending-adjustments queues.'),
      S.bullet('Compound: (employeeId, date) - powers per-employee history.'),
      S.bullet('initiatedAt: descending - powers chronological views.'),
      S.h3('7.3 Workflow rules'),
      S.bullet('Status transitions: Pending -> Approved or Pending -> Rejected. No other transition is permitted.'),
      S.bullet('Once Approved, the linked attendance_derived record is recomputed and the adjustment’s _id is set on appliedAdjustmentId.'),
      S.bullet('There is no auto-approval. There is no time-based deemed approval. Period.'),

      S.h2('8. COLLECTION: devices'),
      S.h3('8.1 Schema'),
      S.codeBlock(`{
  _id: ObjectId,
  deviceCode: String,             // 'DEV-001'
  serialNumber: String,           // eSSL serial e.g., 'TFDB244600829'
  model: String,                  // 'eSSL SilkBio-101TC'
  name: String,                   // 'Main Gate - Entry'
  location: String,
  ipAddress: String,
  lastPingAt: Date,               // updated on each push
  isOnline: Boolean,              // computed: lastPingAt > now - 5 min
  totalEmployeesAssigned: Number, // count of employees mapped via biometricId
  isActive: Boolean,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}`),
      S.h3('8.2 Indexes'),
      S.bullet('serialNumber: unique, ascending.'),
      S.bullet('location: ascending.'),

      S.h2('9. COLLECTION: settings  (singleton)'),
      S.p('Exactly one document, _id is a fixed ObjectId. Reads cached in app process; writes invalidate cache.'),
      S.codeBlock(`{
  _id: ObjectId,                              // fixed, set at seed
  companyName: String,                        // 'Makson Pharmaceuticals (India) Pvt. Ltd.'
  cin: String,
  gstin: String,
  pfRegistrationNumber: String,
  esiRegistrationNumber: String,
  factoryLicenceNumber: String,
  registeredAddress: String,
  signatoryName: String,
  signatoryDesignation: String,

  weeklyOffDefault: [String],                 // company-wide default

  realShifts: [{ id: String, start: String, end: String, label: String }],
  // [{id:'Day',start:'06:00',end:'18:00',label:'Day Shift'},{...Night...}]

  complianceShifts: [{ id: String, start: String, end: String, label: String }],
  // [{id:'A',start:'06:00',end:'14:00',...}, {B...}, {C...}]

  smartAnchorEnabled: Boolean,                // default true
  smartAnchorVersion: String,                 // 'v2.0.0'
  smartAnchorOffsetMinMin: Number,            // default 0
  smartAnchorOffsetMaxMin: Number,            // default 30

  confidentialityNoticeEnabled: Boolean,
  confidentialityNoticeText: String,

  createdAt: Date,
  updatedAt: Date
}`),

      S.h2('10. COLLECTION: audit_log  (APPEND-ONLY)'),
      S.codeBlock(`{
  _id: ObjectId,
  occurredAt: Date,
  userId: ObjectId,               // ref: users (null for system events)
  ipAddress: String,
  userAgent: String,
  eventType: String,              // 'login' | 'login_failed' | 'logout' |
                                  // 'unmask_sensitive' | 'adjustment_initiated' |
                                  // 'adjustment_approved' | 'adjustment_rejected' |
                                  // 'settings_changed' | 'user_created' |
                                  // 'user_locked' | 'device_synced' | etc.
  entityType: String,             // 'user' | 'employee' | 'attendance' | 'adjustment' | 'settings' | 'device'
  entityId: ObjectId,
  payload: Object,                // event-specific structured data
  createdAt: Date                 // == occurredAt
}`),
      S.h3('10.1 Indexes'),
      S.bullet('Compound: (userId, occurredAt) - powers per-user audit queries.'),
      S.bullet('Compound: (entityType, entityId, occurredAt) - powers per-entity history.'),
      S.bullet('Compound: (eventType, occurredAt) - powers event-type filters.'),
      S.bullet('occurredAt: descending - powers global timeline view.'),

      S.h2('11. COLLECTION: unmask_audit  (APPEND-ONLY)'),
      S.codeBlock(`{
  _id: ObjectId,
  userId: ObjectId,               // who unmasked
  employeeId: ObjectId,           // whose data was unmasked
  fieldName: String,              // 'pan' | 'aadhaar' | 'bankAccountNumber' | 'pfNumber' | 'esiNumber'
  occurredAt: Date,
  ipAddress: String,
  userAgent: String,
  reason: String,                 // optional - if a reason was provided
  createdAt: Date
}`),
      S.h3('11.1 Indexes'),
      S.bullet('Compound: (userId, occurredAt).'),
      S.bullet('Compound: (employeeId, occurredAt).'),
      S.bullet('Compound: (fieldName, occurredAt).'),

      S.h2('12. COLLECTION: csv_imports'),
      S.codeBlock(`{
  _id: ObjectId,
  initiatedBy: ObjectId,          // ref: users
  fileName: String,
  fileSizeBytes: Number,
  rowCount: Number,
  successCount: Number,
  failureCount: Number,
  errors: [{ rowIndex: Number, field: String, error: String }],
  startedAt: Date,
  completedAt: Date,
  status: String,                 // 'processing' | 'completed' | 'failed'
  createdAt: Date,
  updatedAt: Date
}`),

      S.h2('13. COLLECTION: refresh_tokens'),
      S.codeBlock(`{
  _id: ObjectId,
  userId: ObjectId,
  tokenHash: String,              // sha256 of the opaque token
  expiresAt: Date,                // 7 days from issue
  revokedAt: Date,                // null when active
  rotatedFromTokenHash: String,   // chain reference for forensic trace
  issuedFromIp: String,
  createdAt: Date
}`),
      S.bullet('TTL index on expiresAt - MongoDB auto-expires.'),
      S.bullet('Compound: (userId, revokedAt) - powers active-session queries.'),

      S.h2('14. SEED DATA'),
      S.bullet('Two users: hr.admin@makson-group.com (role: hr.admin) and hr.compliance@makson-group.com (role: hr.compliance). Default password "makson2026" - MUST be rotated on first login.'),
      S.bullet('One settings document populated from Makson onboarding inputs.'),
      S.bullet('No employee, attendance, or adjustment seed data on production. Dev environments may seed 1,800 mock employees using the same generator pattern as the mockup (sr() PRNG).'),

      S.h2('15. MIGRATION STRATEGY'),
      S.p('Phase 1 has no migrations from a legacy system - employee master is loaded via CSV import; attendance starts fresh from kickoff. The schema versioning convention is _schemaVersion field on each document, defaulting to "1.0.0". When schema evolves, write a one-time migration script under mams-server/migrations/ that updates _schemaVersion on touched documents.'),

      S.h2('16. RELATED DOCUMENTS'),
      S.bullet('System Architecture Document - high-level architecture and data flows.'),
      S.bullet('eSSL ADMS Protocol Cheat-sheet - device push payload format.'),
      S.bullet('Local Dev Setup Guide - how to seed and inspect the DB locally.'),
      S.bullet('Approved mockup - https://makson-payroll-mockup.netlify.app'),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'tech', '02_Database_Schema_Reference.docx'), buf);
  console.log('DB Schema Reference created');
});
