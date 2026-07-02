#!/usr/bin/env node
/**
 * Generates API_DOCUMENTATION.md from route file scan.
 * Run: node scripts/generate-api-doc.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ROUTES_DIR = path.join(ROOT, 'mams-server', 'src', 'routes');
const OUT = path.join(ROOT, 'API_DOCUMENTATION.md');

const MOUNT_MAP = {
  'auth.routes.ts': '/api/auth',
  'employees.routes.ts': '/api/employees',
  'csvImport.routes.ts': '/api/employees/import-csv',
  'attendance.routes.ts': '/api/attendance',
  'complianceAttendance.routes.ts': '/api/compliance-attendance',
  'dashboard.routes.ts': '/api/dashboard',
  'adjustments.routes.ts': '/api/adjustments',
  'employeeChangeRequests.routes.ts': '/api/employee-change-requests',
  'devices.routes.ts': '/api/devices',
  'settings.routes.ts': '/api/settings',
  'reports.routes.ts': '/api/reports',
  'users.routes.ts': '/api/users',
  'goLive.routes.ts': '/api/go-live',
  'activity.routes.ts': '/api/activity',
  'leave.routes.ts': '/api/leave',
  'regularization.routes.ts': '/api/regularization',
  'visitors.routes.ts': '/api/visitors',
  'admin.routes.ts': '/api/admin',
  'adminOverview.routes.ts': '/api/admin/overview',
  'notifications.routes.ts': '/api/notifications',
  'publicVisitor.routes.ts': '/api/public/visitor-forms',
  'essl.routes.ts': '/iclock',
  'hanvon.routes.ts': '/integrations/hanvon',
};

const MODULE_MAP = {
  'auth.routes.ts': 'Auth & Sessions',
  'employees.routes.ts': 'Employees',
  'csvImport.routes.ts': 'Employees & CSV Import',
  'attendance.routes.ts': 'Attendance',
  'complianceAttendance.routes.ts': 'Compliance Attendance & Report Jobs',
  'dashboard.routes.ts': 'Dashboard',
  'adjustments.routes.ts': 'Adjustments',
  'employeeChangeRequests.routes.ts': 'Employee Change Requests',
  'devices.routes.ts': 'Devices',
  'settings.routes.ts': 'Settings',
  'reports.routes.ts': 'Reports',
  'users.routes.ts': 'Users & RBAC',
  'goLive.routes.ts': 'Go-Live',
  'activity.routes.ts': 'Activity & Audit',
  'leave.routes.ts': 'Leave',
  'regularization.routes.ts': 'Regularization',
  'visitors.routes.ts': 'Visitors (admin)',
  'admin.routes.ts': 'Admin & Feature Flags',
  'adminOverview.routes.ts': 'Admin Overview',
  'notifications.routes.ts': 'Notifications',
  'publicVisitor.routes.ts': 'Public Visitors',
  'essl.routes.ts': 'Device Integrations (eSSL)',
  'hanvon.routes.ts': 'Device Integrations (Hanvon)',
};

const ROUTER_AUTH = {
  'auth.routes.ts': 'Mixed — login/refresh public; others JWT',
  'employees.routes.ts': 'JWT (router.use requireAuth)',
  'csvImport.routes.ts': 'JWT + manageEmployeesGate',
  'attendance.routes.ts': 'JWT',
  'complianceAttendance.routes.ts': 'JWT + read.compliant (per-route)',
  'dashboard.routes.ts': 'JWT',
  'adjustments.routes.ts': 'JWT + per-route permissions',
  'employeeChangeRequests.routes.ts': 'JWT + per-route permissions',
  'devices.routes.ts': 'JWT + manage.devices on writes',
  'settings.routes.ts': 'JWT',
  'reports.routes.ts': 'JWT (viewMode from token)',
  'users.routes.ts': 'JWT + manageUsersGate',
  'goLive.routes.ts': 'JWT + read.real',
  'activity.routes.ts': 'JWT + read.org_audit on /org',
  'leave.routes.ts': 'JWT + per-route leave permissions',
  'regularization.routes.ts': 'JWT + per-route permissions',
  'visitors.routes.ts': 'JWT + visitor permissions',
  'admin.routes.ts': 'JWT + per-route permissions',
  'adminOverview.routes.ts': 'JWT + read.system_health (router)',
  'notifications.routes.ts': 'JWT + org.admin only (router)',
  'publicVisitor.routes.ts': 'Public',
  'essl.routes.ts': 'Device serial whitelist',
  'hanvon.routes.ts': 'X-Device-Serial + optional pushToken',
};

// Manual paths for multi-line router declarations
const MULTILINE_PATHS = {
  'complianceAttendance.routes.ts:108': { method: 'GET', path: '/month-hours' },
  'complianceAttendance.routes.ts:127': { method: 'POST', path: '/financial-report.xlsx' },
  'complianceAttendance.routes.ts:139': { method: 'PATCH', path: '/:id' },
  'adminOverview.routes.ts:236': { method: 'GET', path: '/attendance' },
  'adminOverview.routes.ts:249': { method: 'GET', path: '/users' },
  'adminOverview.routes.ts:270': { method: 'GET', path: '/audit' },
  'adminOverview.routes.ts:305': { method: 'GET', path: '/employees' },
  'adminOverview.routes.ts:318': { method: 'GET', path: '/attendance.xlsx' },
  'adminOverview.routes.ts:324': { method: 'GET', path: '/users.xlsx' },
  'adminOverview.routes.ts:330': { method: 'GET', path: '/audit.xlsx' },
  'adminOverview.routes.ts:338': { method: 'GET', path: '/employees.xlsx' },
  'visitors.routes.ts:261': { method: 'POST', path: '/forms/:id/intro-upload' },
};

function parseRoutes() {
  const endpoints = [];
  const routeRe = /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  const routeReMultiline = /router\.(get|post|put|patch|delete)\(\s*$/gm;

  for (const file of fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.routes.ts'))) {
    const content = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
    const lines = content.split('\n');
    const mount = MOUNT_MAP[file] ?? '/api/unknown';
    const module = MODULE_MAP[file] ?? file;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const key = `${file}:${lineNum}`;

      if (MULTILINE_PATHS[key]) {
        const { method, path: rel } = MULTILINE_PATHS[key];
        endpoints.push({
          method: method.toUpperCase(),
          path: mount + rel,
          file,
          line: lineNum,
          module,
          auth: ROUTER_AUTH[file] ?? 'See route file',
        });
        continue;
      }

      const m = line.match(/router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/);
      if (m) {
        endpoints.push({
          method: m[1].toUpperCase(),
          path: mount + m[2],
          file,
          line: lineNum,
          module,
          auth: ROUTER_AUTH[file] ?? 'See route file',
        });
      } else if (/router\.(get|post|put|patch|delete)\(\s*$/.test(line.trim())) {
        // skip — handled by MULTILINE_PATHS or unknown
      }
    }
  }

  endpoints.push({
    method: 'GET',
    path: '/health',
    file: 'app.ts',
    line: 59,
    module: 'Health',
    auth: 'Public',
  });
  endpoints.push({
    method: 'GET',
    path: '/api/health',
    file: 'routes/index.ts',
    line: 45,
    module: 'Health',
    auth: 'Public',
  });

  return endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

/** Per-route-file metadata for schema + business logic documentation */
const ROUTE_FILE_META = {
  'auth.routes.ts': {
    schemas: 'LoginRequestSchema, RefreshRequestSchema, ChangePasswordRequestSchema+PasswordSchema, CompleteOnboardingTourSchema, UpdatePreferencesRequestSchema',
    collections: 'users, refreshtokens, auditlogs',
    services: 'auth.service (login, logout, rotateRefresh, changePassword)',
    notes: 'loginLimiter on POST /login only (app.ts)',
  },
  'users.routes.ts': {
    schemas: 'UserCreateSchema (route-local), UserUpdateBodySchema, PasswordSchema',
    collections: 'users, refreshtokens',
    services: 'auth.service revokeRefreshTokensForUser, mail.service sendWelcomeUserEmail, audit',
    permissions: 'manageUsersGate on list/create/patch; manage.security|manage.org_users on revoke-sessions',
  },
  'employees.routes.ts': {
    schemas: 'EmployeeListQuerySchema, EmployeeCreateBodySchema, EmployeePatchBodySchema, SensitiveUnmaskFieldSchema',
    collections: 'employees, unmaskaudits, settings (emp code), auditlogs',
    services: 'employee.service toMaskedEmployee, employeeCode.service, audit logUnmask',
    permissions: 'manageEmployeesGate on writes; unmask.sensitive on unmask',
  },
  'csvImport.routes.ts': {
    schemas: 'RowSchema per CSV row (reuses SensitiveFieldsSchema shapes)',
    collections: 'employees, settings',
    contentType: 'text/plain CSV body',
  },
  'adjustments.routes.ts': {
    schemas: 'AdjustmentCreateSchema, AdjustmentDecisionSchema, ListQuerySchema (route-local)',
    collections: 'adjustments, attendancederiveds, employees, auditlogs',
    services: 'attendance.service recomputeDerived on approve',
    permissions: 'write.adjust create; approve.adjust decide/bulk',
  },
  'leave.routes.ts': {
    schemas: 'LeaveTypeCreate/Patch, HolidayCreate/Patch, LeaveApplicationCreate, LeaveDecision, LeaveReject, LeaveQuotaAdjust, LeaveListQuerySchema',
    collections: 'leavetypes, holidays, leaveapplications, leavequotas, leavequotaledgers, employees, settings, notifications',
    services: 'leaveQuota.service, leaveOverlap.service, leaveDayCalculator.service, leaveNotification.service',
    permissions: 'manage.leave, write.leave, approve.leave per route',
  },
  'devices.routes.ts': {
    schemas: 'DeviceBaseSchema, DeviceCreateSchema, DevicePatchSchema (route-local)',
    collections: 'devices, attendanceraws, employees, notifications, auditlogs',
    services: 'deviceSync.service, notification.service on register',
    permissions: 'manage.devices on writes',
  },
  'complianceAttendance.routes.ts': {
    schemas: 'ListQuerySchema (route-local), CreateReportJobBodySchema, ComplianceAttendanceUpdateSchema',
    collections: 'compliancegeneratedattendances, reportjobs',
    services: 'complianceAutogen, reportJob.service, complianceAttendanceList/Update',
    permissions: 'read.compliant; org.admin for financial reports and PATCH',
  },
  'publicVisitor.routes.ts': {
    schemas: 'VisitorPublicSubmitSchema, validateVisitorResponses, validateIntroAttestation',
    collections: 'visitorforms, visitorrequests, visitorfiles, auditlogs, notifications',
    rateLimit: 'getLimiter 30/min, submitLimiter 10/min, uploadLimiter 5/min',
    contentType: 'multipart on upload',
  },
  'essl.routes.ts': {
    schemas: 'Query SN, table=ATTLOG; text/plain body',
    collections: 'devices, attendanceraws, attendancederiveds (via ingest)',
    services: 'attendanceIngestion.service ingestCanonicalPunches',
    auth: 'Device serial SN query param whitelist',
  },
  'hanvon.routes.ts': {
    schemas: 'JSON body parsed by hanvonAdapter',
    collections: 'devices, attendanceraws',
    services: 'attendanceIngestion.service',
    auth: 'X-Device-Serial + optional X-Device-Token',
  },
  'attendance.routes.ts': {
    schemas: 'QuerySchema (route-local), AttendanceRawListQuerySchema, AttendanceRawStatsQuerySchema',
    collections: 'attendancederiveds, attendanceraws',
    services: 'attendanceRawList.service listRawPunches, attendanceRawStats.service getRawPunchStats',
    permissions: 'JWT only; JWT viewMode filters derived attendance projection',
  },
  'dashboard.routes.ts': {
    schemas: 'DashboardAttendanceQuerySchema, DashboardKpiConfigSchema, DashboardLayoutSchema',
    collections: 'employees, attendancederiveds, devices, adjustments, settings',
    services: 'dashboard.service, dashboardLayout.service, dashboardKpi.service, dashboardAttendance.service',
    permissions: 'JWT only; viewMode filters attendance columns',
  },
  'settings.routes.ts': {
    schemas: 'SettingsPatchSchema (route-local), OrgBrandingSchema, ExportNamingSettingsSchema, LeaveQuotaResetPolicySchema',
    collections: 'settings, auditlogs',
    services: 'activity.service diffSettingsValues, audit on patch',
    permissions: 'manage.org_settings for org fields; manage.export_naming for exportNaming patch',
  },
  'reports.routes.ts': {
    schemas: 'FilterSchema (route-local): date, startDate, endDate, yearMonth, department, location',
    collections: 'attendancederiveds, employees, settings',
    services: 'exportBranding.service, plainXlsx.service, exportFileName.service',
    permissions: 'JWT only; viewMode selects real vs compliant columns',
  },
  'regularization.routes.ts': {
    schemas: 'RegularizationCreateSchema, RegularizationListQuerySchema, RegularizationDecisionSchema',
    collections: 'regularizations, attendancederiveds, employees, auditlogs',
    services: 'attendance.service recomputeDerived on approve',
    permissions: 'write.regularization create; approve.regularization approve/reject',
  },
  'visitors.routes.ts': {
    schemas: 'VisitorFormCreate/UpdateSchema, VisitorRequestListQuerySchema, VisitorDecisionSchema',
    collections: 'visitorforms, visitorrequests, visitorfiles, notifications, auditlogs',
    services: 'visitor form/request services, notification on approval',
    permissions: 'read.visitors / approve.visitors / manage.visitors per route',
  },
  'admin.routes.ts': {
    schemas: 'FeatureFlagsPatchSchema (route-local)',
    collections: 'settings (feature flags embedded)',
    services: 'feature flag read/update',
    permissions: 'manage.feature_flags on PATCH; read.system_health on GET /health',
  },
  'adminOverview.routes.ts': {
    schemas: 'AdminOverviewTableListQuerySchema, AdminOverviewKpiSchema, AdminOverviewWidgetSchema, AdminOverviewTableConfigSchema',
    collections: 'users, employees, attendancederiveds, devices, auditlogs',
    services: 'adminOverview stats/tables/charts/kpi services, plainXlsx exports',
    permissions: 'read.system_health router; per-route read.real/compliant, manage.org_users, read.org_audit',
  },
  'notifications.routes.ts': {
    schemas: 'NotificationListQuerySchema, NotificationCreateSchema',
    collections: 'notifications',
    services: 'notification list/create/mark-read',
    permissions: 'org.admin role only (entire router gate)',
  },
  'activity.routes.ts': {
    schemas: 'ActivityListQuerySchema, ActivityLogBodySchema',
    collections: 'activitylogs, auditlogs',
    services: 'activity.service log/list',
    permissions: 'read.org_audit OR read.compliance_activity on GET /org',
  },
  'employeeChangeRequests.routes.ts': {
    schemas: 'EmployeeChangeRequestCreateSchema, EmployeeChangeRequestDecisionSchema, ListQuerySchema (route-local)',
    collections: 'employeechangerequests, employees',
    services: 'apply approved changes to employees collection',
    permissions: 'write.employee_change create; approve.employee_change decide',
  },
  'goLive.routes.ts': {
    schemas: 'OrphanQuerySchema',
    collections: 'employees, attendanceraws, devices',
    services: 'orphan detection for go-live readiness',
    permissions: 'read.real',
  },
};

/** Endpoint-specific overrides keyed by "METHOD /full/path" */
const ENDPOINT_OVERRIDES = {
  'GET /health': {
    description: 'Public liveness probe mounted at app root (duplicate of GET /api/health).',
    responses: `| 200 | Healthy | \`{ status: "ok" }\` |`,
    logic: 'No DB access; immediate JSON response.',
  },
  'GET /api/health': {
    description: 'Public liveness probe under /api router.',
    responses: `| 200 | Healthy | \`{ status: "ok" }\` |`,
    logic: 'No DB access; immediate JSON response.',
  },
  'POST /api/auth/login': {
    description: 'Authenticate with email/password; returns JWT pair and user profile.',
    requestBody: `| email | string | yes | valid email |
| password | string | yes | min 1 char |`,
    responses: `| 200 | Valid credentials | \`{ user, accessToken, refreshToken, isFirstLogin }\` |
| 400 | Zod validation | \`{ error: "validation_failed", message, issues }\` |
| 401 | Invalid credentials | \`{ error: "invalid_credentials", message }\` (auth.service) |
| 429 | Rate limited | loginLimiter 10/min per IP |`,
    logic: 'auth.service login → users lookup, bcrypt verify → refreshtokens create → audit log.',
  },
  'POST /api/auth/refresh': {
    description: 'Rotate refresh token; returns new access+refresh pair.',
    requestBody: `| refreshToken | string | yes | opaque refresh token |`,
    responses: `| 200 | Valid refresh | \`{ user, accessToken, refreshToken }\` |
| 401 | Invalid/expired refresh | \`{ error: "invalid_refresh", message }\` |`,
    logic: 'auth.service rotateRefresh → refreshtokens atomic rotate.',
  },
  'POST /api/auth/logout': {
    description: 'Revoke refresh token; requires valid access JWT.',
    requestBody: `| refreshToken | string | yes | token to revoke |`,
    responses: `| 204 | Success | empty body |
| 401 | Missing/invalid JWT | \`{ error: "unauthenticated" }\` |`,
    logic: 'auth.service logout → refreshtokens delete; audit logout event.',
  },
  'GET /api/auth/me': {
    description: 'Current session user + JWT claims.',
    responses: `| 200 | Active user | \`{ auth, user }\` |
| 401 | Inactive/missing user | \`{ error: "session_invalid", message }\` |`,
    logic: 'UserModel.findById → ensureUserRoleDefaultPermissions backfill.',
  },
  'POST /api/auth/change-password': {
    requestBody: `| currentPassword | string | yes | |
| newPassword | string | yes | PasswordSchema: 10–128 chars, strength score ≥ 3 |`,
    responses: `| 200 | Changed | \`{ user }\` |
| 400 | Weak password / Zod | validation_failed or password policy |
| 401 | Wrong current password | \`{ error: "invalid_credentials" }\` |`,
    logic: 'auth.service changePassword → bcrypt verify + hash; may revoke sessions.',
  },
  'POST /api/auth/onboarding/complete': {
    requestBody: `| tour | string | yes | enum: dashboard, employees, attendance, reports, adjustments, regularization, leave, visitors, devices, settings, admin-overview |`,
    responses: `| 200 | Tour marked complete | \`{ user }\` |`,
    logic: 'auth.service completeOnboardingTour → users onboardingToursCompleted push.',
  },
  'PATCH /api/auth/preferences': {
    requestBody: `| themePreference | string | optional* | light \\| dark \\| system (*at least one field) |`,
    responses: `| 200 | Updated | \`{ user }\` |`,
    logic: 'auth.service updateUserPreferences.',
  },
  'PATCH /api/leave/applications/:id/approve': {
    description: 'Approve pending leave application; consumes quota and notifies employee.',
    requestBody: `| approverNote | string | no | max 2000 |`,
    responses: `| 200 | Approved | populated leave application |
| 400 | invalid_status | Only Pending can be approved |
| 403 | forbidden | Missing approve.leave |
| 404 | not_found | Application or leave type missing |`,
    logic: 'leaveQuota.service consumeQuotaForLeave → leaveNotification.service → status Approved.',
  },
  'PATCH /api/regularization/:id/approve': {
    description: 'Approve regularization request; recomputes derived attendance.',
    responses: `| 200 | Approved | regularization document |
| 400 | invalid_status | Not pending |
| 403 | forbidden | Missing approve.regularization |
| 404 | not_found | Request not found |`,
    logic: 'Update regularizations → attendance.service recomputeDerived for affected dates.',
  },
  'POST /api/public/visitor-forms/:slug/submit': {
    description: 'Public visitor form submission (no JWT).',
    requestBody: `| responses | object | yes | fieldId → value per form schema |
| fileRefs | array | no | { fieldId, storageKey } from prior upload |
| introAttestation | object | conditional | required when form mandates intro video |`,
    responses: `| 201 | Submitted | \`{ ok: true, message }\` |
| 400 | validation_error / intro_video_required / invalid_file_ref | ApiError with details |
| 403 | form_inactive | Form disabled |
| 404 | not_found | Invalid slug |
| 410 | link_retired | Slug rotated |`,
    logic: 'Validate responses → visitorrequests create → notifyOrgAdmins → audit.',
  },
  'POST /integrations/hanvon/push': {
    description: 'Hanvon biometric device punch push.',
    requestBody: 'Raw JSON parsed by hanvonAdapter (device-specific punch records).',
    responses: `| 200 | Ingested | \`{ ok: true, ingested: N }\` |
| 401 | Unknown serial / bad token | device auth failure |
| 400 | Parse error | invalid payload |`,
    logic: 'Resolve device by X-Device-Serial → optional token check → attendanceIngestion.service.',
  },
  'POST /api/compliance-attendance/report-jobs': {
    description: 'Enqueue async compliance or financial XLSX report job.',
    requestBody: `| type | string | yes | compliance_monthly \\| financial |
| yearMonth | string | yes | YYYY-MM |
| overrides | string | no | max 500 chars |`,
    responses: `| 202 | Job queued | \`{ jobId, status: "pending" }\` |
| 403 | forbidden | Missing read.compliant or org.admin for financial |`,
    logic: 'reportJob.service enqueueReportJob → reportjobs collection; runner processes async.',
  },
  'POST /api/compliance-attendance/report.xlsx': {
    description: '**Deprecated** — synchronous report replaced by report-jobs.',
    responses: `| 410 | Gone | \`{ error: "deprecated", message }\` |`,
    logic: 'Immediate 410; use POST /report-jobs instead.',
  },
  'POST /api/compliance-attendance/financial-report.xlsx': {
    description: '**Deprecated** — synchronous financial report.',
    responses: `| 410 | Gone | \`{ error: "deprecated", message }\` |`,
    logic: 'Immediate 410; use POST /report-jobs with type financial.',
  },
};

function endpointKey(ep) {
  return `${ep.method} ${ep.path}`;
}

const APPENDIX_A = `
## Appendix A — Zod Schema Reference

All API validation uses **Zod** in \`shared/types/src/\`. Route-local schemas exist in some route files.

### Auth (\`user.ts\`)

| Schema | Fields | Rules |
|--------|--------|-------|
| LoginRequestSchema | email, password | email valid; password min 1 |
| RefreshRequestSchema | refreshToken | string required |
| ChangePasswordRequestSchema | currentPassword, newPassword | min 1 each; route extends newPassword with PasswordSchema (10–128 chars, score≥3) |
| UpdatePreferencesRequestSchema | themePreference | light \\| dark \\| system; at least one field |
| CompleteOnboardingTourSchema | tour | enum: dashboard, employees, attendance, reports, adjustments, regularization, leave, visitors, devices, settings, admin-overview |

### Employee (\`employee.ts\`)

| Schema | Key rules |
|--------|-----------|
| EmployeeListQuerySchema | page default 1, pageSize 50 max 200; sortBy name/empCode/department/status/joinDate |
| EmployeeCreateBodySchema | empCode regex ^MKS\\\\d{4}$; SensitiveFieldsSchema for PAN/Aadhaar/bank; weeklyOff 1–2 weekdays |
| EmployeePatchBodySchema | partial create; empCode not patchable |
| SensitiveUnmaskFieldSchema | pan, aadhaar, bankAccountNumber, pfNumber, esiNumber, ifsc, bankName, accountHolderName, accountType |

### Adjustment (\`adjustment.ts\`)

| Schema | Key rules |
|--------|-----------|
| AdjustmentCreateSchema | fieldChanged enum 5 fields; justification min 10 max 2000; reason enum missed_punch/wrong_device/system_outage/shift_swap/other |
| AdjustmentDecisionSchema | decision approve\\|reject; approverNote max 2000 optional |

### Leave (\`leave.ts\`)

| Schema | Key rules |
|--------|-----------|
| LeaveApplicationCreateSchema | fromDate≤toDate; half-day single date; reason 1–2000 |
| LeaveTypeCreateSchema | code ^[a-z0-9_]+$; name 1–120 |
| LeaveQuotaAdjustSchema | delta number; reason 1–500 |
| LeaveListQuerySchema | page 1, pageSize 50 max 200 |

### Regularization (\`regularization.ts\`)

| Schema | Key rules |
|--------|-----------|
| RegularizationCreateSchema | type missed_in/out/both/wrong_punch/other; IN/OUT times required per type; reason 10–2000 |
| RegularizationListQuerySchema | page 1, pageSize 50 max 200 |

### Visitor (\`visitor.ts\`)

| Schema | Key rules |
|--------|-----------|
| VisitorFormCreateSchema | 1–100 fields; unique field IDs |
| VisitorPublicSubmitSchema | responses record; fileRefs array; introAttestation optional |
| VisitorRequestListQuerySchema | status filter; page 1, pageSize 50 max 200 |

### Report jobs (\`reportJob.ts\`)

| Schema | Key rules |
|--------|-----------|
| CreateReportJobBodySchema | type compliance_monthly\\|financial; yearMonth YYYY-MM; overrides max 500 |

### Permissions (\`user.ts\` PermissionSchema)

28 permissions: read.real, read.compliant, write.adjust, approve.adjust, unmask.sensitive, manage.users, manage.employees, manage.devices, manage.settings, manage.export_naming, manage.org_users, manage.org_settings, manage.security, read.org_audit, manage.feature_flags, read.system_health, read.leave, write.leave, approve.leave, manage.leave, write.regularization, approve.regularization, read.visitors, approve.visitors, manage.visitors, read.compliance_activity, write.employee_change, approve.employee_change

### Roles (\`user.ts\` RoleSchema)

org.admin, hr.admin, hr.compliance, it.admin

---

## Appendix B — Route File → Schema / Collection Map

| Route file | Primary Zod schemas | Collections touched |
|------------|---------------------|---------------------|
| auth.routes.ts | LoginRequestSchema, RefreshRequestSchema, etc. | users, refreshtokens, auditlogs |
| users.routes.ts | UserCreateSchema, UserUpdateBodySchema | users, refreshtokens |
| employees.routes.ts | EmployeeListQuerySchema, EmployeeCreateBodySchema | employees, unmaskaudits |
| leave.routes.ts | Leave* schemas | leavetypes, holidays, leaveapplications, leavequotas, leavequotaledgers |
| adjustments.routes.ts | AdjustmentCreateSchema, ListQuerySchema | adjustments, attendancederiveds |
| devices.routes.ts | DeviceBaseSchema (route-local) | devices, attendanceraws |
| complianceAttendance.routes.ts | ListQuerySchema, CreateReportJobBodySchema | compliancegeneratedattendances, reportjobs |
| visitors.routes.ts | VisitorFormCreate/UpdateSchema | visitorforms, visitorrequests, visitorfiles |
| publicVisitor.routes.ts | VisitorPublicSubmitSchema | visitorforms, visitorrequests, visitorfiles, notifications |
| essl.routes.ts | (protocol parsing, no Zod) | devices, attendanceraws |
| hanvon.routes.ts | (adapter parsing) | devices, attendanceraws |
| attendance.routes.ts | QuerySchema, AttendanceRawListQuerySchema | attendancederiveds, attendanceraws |
| dashboard.routes.ts | DashboardAttendanceQuerySchema, DashboardKpiConfigSchema | employees, attendancederiveds, devices |
| settings.routes.ts | SettingsPatchSchema (route-local) | settings |
| reports.routes.ts | FilterSchema (route-local) | attendancederiveds, employees |
| regularization.routes.ts | RegularizationCreateSchema, RegularizationListQuerySchema | regularizations, attendancederiveds |
| visitors.routes.ts | VisitorFormCreate/UpdateSchema | visitorforms, visitorrequests |
| admin.routes.ts | FeatureFlagsPatchSchema | settings |
| adminOverview.routes.ts | AdminOverview* schemas | users, employees, devices, auditlogs |
| notifications.routes.ts | NotificationListQuerySchema | notifications |
| activity.routes.ts | ActivityListQuerySchema, ActivityLogBodySchema | activitylogs |
| employeeChangeRequests.routes.ts | EmployeeChangeRequestCreateSchema | employeechangerequests, employees |
| goLive.routes.ts | OrphanQuerySchema | employees, attendanceraws, devices |

---

`;

function needsBearerAuth(ep) {
  if (ep.auth === 'Public') return false;
  if (ep.module.includes('eSSL')) return false;
  if (ep.path === '/api/auth/login' || ep.path === '/api/auth/refresh') return false;
  if (ep.path.startsWith('/iclock')) return false;
  if (ep.path.startsWith('/integrations/hanvon')) return false;
  if (ep.path === '/health' || ep.path === '/api/health') return false;
  if (ep.path.startsWith('/api/public/visitor-forms')) return false;
  return true;
}

function opId(ep) {
  return (
    ep.method.toLowerCase() +
    ep.path
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 80)
  );
}

function openApiSnippet(ep) {
  const sec = needsBearerAuth(ep) ? [{ bearerAuth: [] }] : [];
  return `paths:
  "${ep.path}":
    ${ep.method.toLowerCase()}:
      operationId: ${opId(ep)}
      summary: ${ep.module} — ${ep.method} ${ep.path}
      tags: [${ep.module}]
      security: ${sec.length ? '[{ bearerAuth: [] }]' : '[]'}
      responses:
        '200':
          description: Success
        '400':
          description: validation_failed (Zod)
        '401':
          description: unauthenticated / invalid_token
        '403':
          description: forbidden
        '404':
          description: not_found
        '500':
          description: internal_error`;
}

function postmanItem(ep) {
  const headers = [];
  if (needsBearerAuth(ep)) {
    headers.push({ key: 'Authorization', value: 'Bearer {{accessToken}}' });
  }
  if (ep.path.includes('hanvon')) {
    headers.push({ key: 'X-Device-Serial', value: '{{deviceSerial}}' });
    headers.push({ key: 'X-Device-Token', value: '{{deviceToken}}' });
  }
  return {
    name: `${ep.method} ${ep.path}`,
    request: {
      method: ep.method,
      header: headers,
      url: { raw: '{{baseUrl}}' + ep.path, host: ['{{baseUrl}}'], path: ep.path.split('/').filter(Boolean) },
    },
  };
}

function endpointSection(ep) {
  const meta = ROUTE_FILE_META[ep.file] ?? {};
  const override = ENDPOINT_OVERRIDES[endpointKey(ep)] ?? {};
  const pathParams = (ep.path.match(/:[a-zA-Z]+/g) || []).join(', ') || 'none';
  const rateNote =
    ep.path === '/api/auth/login'
      ? 'loginLimiter 10/min per IP'
      : ep.path.includes('/api/public/visitor-forms') && ep.method === 'GET'
        ? 'getLimiter 30/min'
        : ep.path.includes('/submit')
          ? 'submitLimiter 10/min'
          : ep.path.includes('/upload')
            ? 'uploadLimiter 5/min'
            : ep.path === '/api/activity/log'
              ? 'activityLogLimiter 40/min per user'
              : ep.path.startsWith('/iclock')
                ? 'iclockLimiter 600/min'
                : ep.path.startsWith('/integrations/hanvon')
                  ? 'hanvonLimiter 300/min'
                  : 'none';

  const defaultResponses = `| Status | When | Body |
|--------|------|------|
| 200 | Success | JSON per handler |
| 201 | Created | JSON resource |
| 202 | Accepted (async jobs) | Job descriptor |
| 204 | No content (logout) | empty |
| 400 | Zod validation | \`{ error: "validation_failed", message, issues }\` |
| 401 | Missing/invalid JWT | \`{ error: "unauthenticated" }\` or \`invalid_token\` |
| 403 | Missing permission | \`{ error: "forbidden", requiredPermission? }\` |
| 404 | Not found | \`{ error: "not_found", message }\` |
| 409 | Conflict | \`{ error, message }\` |
| 410 | Deprecated / retired link | \`{ error, message }\` |
| 500 | Unhandled error | \`{ error: "internal_error" }\` |`;

  const responsesBlock = override.responses
    ? `| Status | When | Body |\n|--------|------|------|\n${override.responses}`
    : defaultResponses;

  const requestBodyBlock = override.requestBody
    ? `\n**Body fields:**\n\n| Field | Type | Required | Validation |\n|-------|------|----------|------------|\n${override.requestBody}\n`
    : '';

  const logicBlock = override.logic ?? `**Services:** ${meta.services ?? 'See route handler imports in services/'}  
**Collections:** ${meta.collections ?? 'See DATABASE_DOCUMENTATION.md module matrix'}  
**Side effects:** audit logs, notifications, email (users create), report job enqueue, attendance recompute — per handler.`;

  return `#### ${ep.method} ${ep.path}

**Description:** ${override.description ?? `${ep.module} — see \`${ep.file}\` handler at line ${ep.line}.`}

**Route:** \`mams-server/src/routes/${ep.file}\` line ${ep.line}

**Auth:** ${ep.auth}${meta.permissions ? ` — ${meta.permissions}` : ''}

**Middleware chain:** helmet → cors → express.json(1mb) → requestContext → router.use middleware → route-level middleware → handler

**Rate limit:** ${rateNote}

##### Request

| Aspect | Detail |
|--------|--------|
| Content-Type | ${meta.contentType ?? (ep.path.includes('upload') ? 'multipart/form-data' : ep.path.startsWith('/iclock') ? 'text/plain' : 'application/json')} |
| Path params | ${pathParams} |
| Query / Body Zod | ${meta.schemas ?? 'See imports in route file and Appendix A'} |
| Required headers | ${needsBearerAuth(ep) ? 'Authorization: Bearer <token>' : ep.path.startsWith('/integrations/hanvon') ? 'X-Device-Serial, X-Device-Token (optional if device has no pushToken)' : ep.path.startsWith('/iclock') ? 'Query SN (serial)' : 'none'} |
${requestBodyBlock}
##### Responses

${responsesBlock}

##### Business logic

${logicBlock}

##### Idempotency

Device punch ingest uses \`idempotencyKey\` on attendanceraws. Report jobs use atomic status claim. Most mutations are not idempotent.

##### Validation order

${rateNote !== 'none' ? '1. Rate limit → ' : ''}body parser → requireAuth → permission middleware → Zod parse → business rules (ApiError) → service layer

##### OpenAPI 3.0 snippet

\`\`\`yaml
${openApiSnippet(ep)}
\`\`\`

##### Postman request snippet

\`\`\`json
${JSON.stringify(postmanItem(ep), null, 2)}
\`\`\`

---
`;
}

function buildPostmanCollection(endpoints) {
  const folders = {};
  for (const ep of endpoints) {
    if (!folders[ep.module]) folders[ep.module] = [];
    folders[ep.module].push(postmanItem(ep));
  }
  return {
    info: {
      name: 'MAMS API',
      description: 'Makson Attendance Management System — generated from route scan',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'baseUrl', value: 'http://localhost:3000' },
      { key: 'accessToken', value: '' },
      { key: 'deviceSerial', value: '' },
      { key: 'deviceToken', value: '' },
    ],
    item: Object.entries(folders).map(([name, items]) => ({ name, item: items })),
  };
}

function main() {
  const endpoints = parseRoutes();
  const byModule = {};
  for (const ep of endpoints) {
    if (!byModule[ep.module]) byModule[ep.module] = [];
    byModule[ep.module].push(ep);
  }

  let md = `# MAMS API Documentation

**Project:** Makson Attendance Management System (MAMS)  
**Server:** Express 4 + Zod (\`@mams/types\`)  
**Document version:** 1.0 — generated from route scan (June 2026)  
**Total endpoints:** ${endpoints.length}  
**Companion:** [DATABASE_DOCUMENTATION.md](./DATABASE_DOCUMENTATION.md) | [MAMS-WORKFLOW-AUDIT.md](./docs/MAMS-WORKFLOW-AUDIT.md)

---

## Table of Contents

1. [Section 0 — API Conventions](#section-0--api-conventions)
2. [Section 1 — Master Endpoint Inventory](#section-1--master-endpoint-inventory)
3. [Sections 2–22 — Per-Module Reference](#sections-222--per-module-reference)
4. [Section 23 — Auth & Rate Limiting](#section-23--auth--rate-limiting)
5. [Section 24 — Auth Flow Diagrams](#section-24--auth-flow-diagrams)
6. [Section 25 — OpenAPI Components](#section-25--openapi-components)
7. [Section 26 — Postman Collection](#section-26--postman-collection)
8. [Section 27 — Inconsistencies and Risks](#section-27--inconsistencies-and-risks)

---

## Section 0 — API Conventions

### Base URLs

| Surface | Prefix | Auth |
|---------|--------|------|
| Authenticated REST | \`/api/*\` | JWT Bearer |
| Public health | \`/health\`, \`/api/health\` | None |
| Public visitors | \`/api/public/visitor-forms/*\` | None + rate limits |
| eSSL ADMS | \`/iclock/*\` | Device serial in query |
| Hanvon push | \`/integrations/hanvon/push\` | Headers + device registry |

### Headers

| Header | Required | Purpose |
|--------|----------|---------|
| \`Authorization: Bearer <accessToken>\` | Most \`/api/*\` routes | JWT access token from login/refresh |
| \`Content-Type: application/json\` | JSON bodies | Default parser limit 1mb |
| \`x-cron-secret\` | Compliance autogen cron | Must match \`COMPLIANCE_AUTOGEN_CRON_SECRET\` |
| \`X-Device-Serial\` | Hanvon push | Device serial number |
| \`X-Device-Token\` | Hanvon push | Must match device \`integrationConfig.pushToken\` when set |

### Standard error envelope

| Status | Shape |
|--------|-------|
| 400 Zod | \`{ error: "validation_failed", message, issues }\` |
| 401 | \`{ error: "unauthenticated" }\` or \`{ error: "invalid_token" }\` |
| 403 | \`{ error: "forbidden", requiredPermission?, requiredPermissions? }\` |
| ApiError | \`{ error: code, message, details? }\` |
| 500 | \`{ error: "internal_error", message? }\` (message in dev only) |

### Validation order

\`\`\`mermaid
flowchart TD
    A[Incoming request] --> B{Rate limiter?}
    B --> C{Body parser / multer?}
    C --> D{requireAuth?}
    D --> E{Permission middleware?}
    E --> F{Zod parse query/body}
    F --> G{Route business rules}
    G --> H[Service layer]
    H --> I[Response]
    F -->|ZodError| J[400 validation_failed]
    G -->|ApiError| K[4xx/5xx]
    D -->|fail| L[401]
    E -->|fail| M[403]
\`\`\`

### Source-of-truth hierarchy

1. \`mams-server/src/routes/*.ts\` — handlers, middleware order
2. \`shared/types/src/*.ts\` — Zod schemas
3. \`mams-server/src/middleware/auth.ts\` — JWT and permissions
4. \`mams-server/src/middleware/error.ts\` — error handler
5. \`mams-server/src/services/**\` — business logic

---

## Section 1 — Master Endpoint Inventory

| # | Method | Full path | Route file:line | Module | Auth summary |
|---|--------|-----------|-----------------|--------|--------------|
`;

  endpoints.forEach((ep, i) => {
    md += `| ${i + 1} | ${ep.method} | \`${ep.path}\` | \`${ep.file}:${ep.line}\` | ${ep.module} | ${ep.auth} |\n`;
  });

  md += `
---

${APPENDIX_A}

## Sections 2–22 — Per-Module Reference

`;

  for (const [module, eps] of Object.entries(byModule).sort((a, b) => a[0].localeCompare(b[0]))) {
    md += `### Module: ${module}\n\n`;
    for (const ep of eps) {
      md += endpointSection(ep);
    }
  }

  md += `---

## Section 23 — Auth & Rate Limiting

### Middleware (\`middleware/auth.ts\`)

| Function | Behavior |
|----------|----------|
| \`requireAuth\` | Requires \`Authorization: Bearer\` JWT; sets \`req.auth\` |
| \`requirePermission(p)\` | 403 if permission not in JWT claims |
| \`requireAnyPermission(...ps)\` | 403 if none of permissions match |

### Router-level gates

| Gate | Definition | Routers |
|------|------------|---------|
| \`manageEmployeesGate\` | \`manage.employees\` OR \`manage.users\` | employees, csvImport |
| \`manageUsersGate\` | \`manage.org_users\` OR \`manage.users\` | users |
| \`requireOrgAdmin\` | \`role === org.admin\` | notifications (all routes) |

### Rate limits

| Limiter | Path | Window | Max |
|---------|------|--------|-----|
| loginLimiter | POST /api/auth/login | 60s | 10/IP |
| getLimiter | GET /api/public/visitor-forms/* | 60s | 30/IP |
| submitLimiter | POST .../submit | 60s | 10/IP |
| uploadLimiter | POST .../upload | 60s | 5/IP |
| activityLogLimiter | POST /api/activity/log | 60s | 40/user |
| iclockLimiter | /iclock/* | 60s | 600 |
| hanvonLimiter | /integrations/hanvon/* | 60s | 300 |

### Pagination defaults (Zod)

| Schema | page | pageSize default | max |
|--------|------|------------------|-----|
| EmployeeListQuerySchema | 1 | 50 | 200 |
| LeaveListQuerySchema | 1 | 50 | 200 |
| Compliance ListQuerySchema | 1 | 50 | 500 |
| NotificationListQuerySchema | 1 | 20 | 100 |
| AdminOverview TableListQuerySchema | 1 | 20 | 100 |
| Adjustment ListQuerySchema | 1 | 50 | 200 |
| RegularizationListQuerySchema | 1 | 50 | 200 |
| AttendanceRawListQuerySchema | 1 | 50 | 200 |
| VisitorRequestListQuerySchema | 1 | 50 | 200 |
| EmployeeChangeRequestListQuerySchema | 1 | 50 | 200 |
| ActivityListQuerySchema | 1 | 50 | 100 |
| OrphanQuerySchema (go-live) | 1 | 25 | 100 |

---

## Section 24 — Auth Flow Diagrams

\`\`\`mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB as users_refreshtokens

    Client->>API: POST /api/auth/login
    API->>DB: verify credentials
    API-->>Client: accessToken refreshToken user

    Client->>API: Authorization Bearer on /api/*
    API-->>Client: 200 or 401 invalid_token

    Client->>API: POST /api/auth/refresh
    API->>DB: rotate refresh token
    API-->>Client: new token pair
\`\`\`

---

## Section 25 — OpenAPI Components

### Paths index (condensed)

All ${endpoints.length} operations; see per-endpoint YAML snippets in Sections 2–22.

\`\`\`yaml
openapi: 3.0.0
info:
  title: MAMS API
  version: 1.0.0
paths:
${endpoints.map((ep) => `  "${ep.path}":
    ${ep.method.toLowerCase()}:
      operationId: ${opId(ep)}
      tags: [${ep.module}]`).join('\n')}
\`\`\`

### Shared components

\`\`\`yaml
openapi: 3.0.0
info:
  title: MAMS API
  version: 1.0.0
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    ValidationError:
      type: object
      properties:
        error: { type: string, example: validation_failed }
        message: { type: string }
        issues: { type: array }
    ApiError:
      type: object
      properties:
        error: { type: string }
        message: { type: string }
        details: { type: object }
\`\`\`

---

## Section 26 — Postman Collection

Import the JSON below into Postman v2.1.

\`\`\`json
${JSON.stringify(buildPostmanCollection(endpoints), null, 2)}
\`\`\`

---

## Section 27 — Inconsistencies and Risks

| Issue | Endpoints affected |
|-------|-------------------|
| Duplicate health endpoints | GET /health vs GET /api/health |
| Notifications org.admin only | All /api/notifications/* |
| Compliance generate inline auth | POST /generate, /generate-month |
| Deprecated sync reports return 410 | POST /report.xlsx, /financial-report.xlsx |
| Employee list auth only no read permission | GET /api/employees |
| Reports/Dashboard use JWT viewMode not permission | /api/reports/*, /api/dashboard/* |
| eSSL unauthenticated serial whitelist | /iclock/* |
| Hanvon token optional if pushToken null | POST /integrations/hanvon/push |
| logout returns 204 | POST /api/auth/logout |
| Non-RESTful action paths | /decide, /approve, /bulk-decide, /toggle-active |
| Route-local Zod not in shared types | devices, settings, adjustments list, compliance list, users create |

---

*End of API_DOCUMENTATION.md — ${endpoints.length} endpoints from route scan.*
`;

  fs.writeFileSync(OUT, md, 'utf8');
  const overrideCount = endpoints.filter((ep) => ENDPOINT_OVERRIDES[endpointKey(ep)]).length;
  const metaCount = new Set(endpoints.map((ep) => ep.file)).size;
  console.log(`Wrote ${OUT} (${endpoints.length} endpoints, ${md.split('\n').length} lines)`);
  console.log(`Accuracy: ${endpoints.length} endpoints (expected 156), ${metaCount} route files, ${overrideCount} endpoint overrides`);
  if (endpoints.length !== 156) {
    console.warn('WARNING: endpoint count mismatch — expected 156');
    process.exitCode = 1;
  }
}

main();
