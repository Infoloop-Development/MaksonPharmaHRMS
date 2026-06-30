# MAMS Workflow Audit — Master Index

**System:** MAMS (Makson Group HRMS)  
**Monorepo:** `mams/` — React/Vite (`mams-web`), Express/MongoDB (`mams-server`), shared types (`shared/types`)  
**Generated for:** Claude-ready business workflow raw material extracted from routes, services, models, and UI.

**Single-file edition:** [../MAMS-WORKFLOW-AUDIT.md](../MAMS-WORKFLOW-AUDIT.md) — all sections below in one document (~3,500 lines).

---

## Reading Order

1. [01-module-inventory.md](./01-module-inventory.md) — every screen and route
2. [02-roles-permissions.md](./02-roles-permissions.md) — RBAC matrices
3. Domain workflows `03`–`13` — step-by-step user journeys
4. System layer `14`–`19` — lifecycles, jobs, notifications, integrations, flags, edge cases

---

## Document Map

| File | Section(s) |
|------|------------|
| [WORKFLOW_TEMPLATE.md](./WORKFLOW_TEMPLATE.md) | Standard workflow doc format |
| [01-module-inventory.md](./01-module-inventory.md) | (1) Modules, screens, purposes, roles |
| [02-roles-permissions.md](./02-roles-permissions.md) | (4) RBAC: roles, permissions, viewMode |
| [03-auth-session-onboarding.md](./03-auth-session-onboarding.md) | (2) Login, password, JWT, tours, provisioning |
| [04-employees-workflows.md](./04-employees-workflows.md) | (2)(3) Employee CRUD, CSV, change requests, unmask |
| [05-attendance-workflows.md](./05-attendance-workflows.md) | (2)(3) Raw punches, derived attendance, dashboard, reports |
| [06-compliance-workflows.md](./06-compliance-workflows.md) | (2)(3) Compliance attendance, autogen, async reports |
| [07-leave-workflows.md](./07-leave-workflows.md) | (2)(3) Leave types, holidays, quota, applications |
| [08-regularization-workflows.md](./08-regularization-workflows.md) | (2)(3) Missed-punch regularization |
| [09-visitors-workflows.md](./09-visitors-workflows.md) | (2)(3) Public forms, admin forms, approvals |
| [10-devices-biometrics-workflows.md](./10-devices-biometrics-workflows.md) | (2)(3) Devices, eSSL/Hanvon ingest |
| [11-admin-console-workflows.md](./11-admin-console-workflows.md) | (2)(3) Admin overview, users, org, security, flags |
| [12-dashboard-settings-workflows.md](./12-dashboard-settings-workflows.md) | (2)(3) Dashboard layout/KPI, HR settings, branding |
| [13-activity-audit-workflows.md](./13-activity-audit-workflows.md) | (2)(3) Activity log, org audit, compliance activity |
| [14-data-lifecycles.md](./14-data-lifecycles.md) | (6) Entity state machines (23 models) |
| [15-background-jobs.md](./15-background-jobs.md) | (5) Cron, pollers, startup jobs |
| [16-notifications-alerts.md](./16-notifications-alerts.md) | (8) In-app and email triggers |
| [17-integrations.md](./17-integrations.md) | (7) MongoDB, SMTP, biometrics, translation, deploy |
| [18-feature-flags-env.md](./18-feature-flags-env.md) | (10) Flags, env vars, behavioral differences |
| [19-edge-cases-retries.md](./19-edge-cases-retries.md) | (9) Rate limits, idempotency, error codes |

---

## Glossary

| Term | Meaning |
|------|---------|
| **real viewMode** | 12-hour attendance projection (real entry/exit, gross/net hours) |
| **compliant viewMode** | 8-hour compliance projection (compliant entry/exit/hours) |
| **Smart Anchor** | Punch-matching engine (`SMART_ANCHOR_VERSION`, `settings.smartAnchorEnabled`) |
| **Compliance autogen** | Synthetic 8h attendance in `ComplianceGeneratedAttendance` |
| **Adjustment** | HR request to change derived attendance; approval re-derives |
| **Regularization** | Synthetic raw punches on approval for missed biometric punches |
| **Employee change request** | Compliance-proposed employee CRUD pending HR approval |
| **Report job** | Async in-process Mongo queue for large XLSX exports |
| **Org admin notification** | In-app bell alert for `org.admin` role only |

---

## Roles Summary

| Role | Default home | Primary focus |
|------|--------------|---------------|
| `org.admin` | `/admin` | Governance + full HR operational access |
| `hr.admin` | `/dashboard` | Real-view HR operations, employee management |
| `hr.compliance` | `/dashboard` | Compliant view, approvals, change requests |
| `it.admin` | `/dashboard` | Devices + leave (limited) |

Four roles, **28 permissions** — see [02-roles-permissions.md](./02-roles-permissions.md).

---

## Explicitly Out of Scope (Not in Code)

- **Public signup** — users provisioned by admins via Settings/Admin Users
- **Payment/transaction flows** — no payment gateway
- **SMS / push notifications** — in-app (`org.admin`) and optional SMTP email only
- **External object storage** — `VisitorFile`, `ReportJob` store binaries in MongoDB

---

## API Endpoint Appendix

All routes mount under server `index.ts`. Auth: `requireAuth` unless noted.

### Auth — `/api/auth`
| Method | Path | Auth | Doc |
|--------|------|------|-----|
| POST | `/login` | — | 03 |
| POST | `/refresh` | — | 03 |
| POST | `/logout` | JWT | 03 |
| GET | `/me` | JWT | 03 |
| POST | `/change-password` | JWT | 03 |
| POST | `/onboarding/complete` | JWT | 03 |
| PATCH | `/preferences` | JWT | 03 |

### Users — `/api/users`
| Method | Path | Permission | Doc |
|--------|------|------------|-----|
| GET | `/` | manage.org_users / manage.users | 03, 11 |
| POST | `/` | manage.org_users / manage.users | 03, 11 |
| PATCH | `/:id` | manage.org_users (admin) or self | 03, 11 |
| POST | `/:id/revoke-sessions` | manage.security / manage.org_users | 03, 11 |

### Employees — `/api/employees`, `/api/employees/import-csv`
| Method | Path | Permission | Doc |
|--------|------|------------|-----|
| GET | `/next-code` | manage.employees / manage.users | 04 |
| GET | `/` | auth | 04 |
| GET | `/:id` | auth | 04 |
| POST | `/` | manage.employees / manage.users | 04 |
| PATCH | `/:id` | manage.employees / manage.users | 04 |
| DELETE | `/:id` | manage.employees / manage.users | 04 |
| POST | `/:id/unmask` | unmask.sensitive | 04 |
| GET | `/import-csv/template` | manage.employees | 04 |
| POST | `/import-csv` | manage.employees | 04 |

### Employee change requests — `/api/employee-change-requests`
| Method | Path | Permission | Doc |
|--------|------|------------|-----|
| GET | `/` | auth | 04 |
| POST | `/` | write.employee_change | 04 |
| POST | `/:id/decide` | approve.employee_change | 04 |

### Attendance — `/api/attendance`
| Method | Path | Permission | Doc |
|--------|------|------------|-----|
| GET | `/` | auth | 05 |
| GET | `/raw` | auth | 05 |
| GET | `/raw/recent` | auth | 05 |
| GET | `/raw/stats` | auth | 05 |

### Adjustments — `/api/adjustments`
| Method | Path | Permission | Doc |
|--------|------|------------|-----|
| GET | `/` | auth | 05, 06 |
| POST | `/` | write.adjust | 05 |
| POST | `/:id/decide` | approve.adjust | 05 |
| POST | `/bulk-decide` | approve.adjust | 05 |

### Dashboard — `/api/dashboard`
| Method | Path | Doc |
|--------|------|-----|
| GET | `/stats`, `/charts`, `/week-trend` | 05, 12 |
| GET/PUT | `/layout`, `/kpi` | 12 |
| GET | `/attendance`, `/attendance/departments`, `/attendance.xlsx` | 05, 12 |

### Reports — `/api/reports`
| Method | Path | Doc |
|--------|------|-----|
| GET | `/daily`, `/monthly`, `/department`, `/location` | 05 |
| GET | `/*.csv`, `/*.xlsx` variants | 05 |

### Compliance attendance — `/api/compliance-attendance`
| Method | Path | Permission | Doc |
|--------|------|------------|-----|
| GET | `/` | read.compliant | 06 |
| POST | `/generate`, `/generate-month` | org.admin / read.compliant / cron secret | 06 |
| PATCH | `/:id` | read.compliant + org.admin | 06 |
| GET | `/month-hours` | read.compliant + org.admin | 06 |
| POST | `/report-jobs` | read.compliant | 06 |
| GET | `/report-jobs/:id`, `.../download` | read.compliant | 06 |
| POST | `/report.xlsx`, `/financial-report.xlsx` | — (410 deprecated) | 06 |

### Leave — `/api/leave`
| Method | Path | Doc |
|--------|------|-----|
| GET | `/summary`, `/types`, `/holidays`, `/quota/*`, `/applications/*`, `/settings/policy` | 07 |
| POST/PATCH/DELETE | types, holidays, quota, applications | 07 |

### Regularization — `/api/regularization`
| Method | Path | Doc |
|--------|------|-----|
| GET | `/`, `/preview` | 08 |
| POST | `/` | 08 |
| PATCH | `/:id/approve`, `/:id/reject` | 08 |

### Visitors — `/api/visitors`, `/api/public/visitor-forms`
| Method | Path | Doc |
|--------|------|-----|
| CRUD | `/forms/*`, `/requests/*`, `/files/:key` | 09 |
| Public | `GET/POST /:slug/*` | 09 |

### Devices — `/api/devices`
| Method | Path | Doc |
|--------|------|-----|
| GET/POST/PATCH/DELETE | `/`, `/:id` | 10 |
| POST | `/:id/test`, `/:id/sync`, `/sync-all` | 10 |

### Biometrics (no JWT)
| Method | Path | Doc |
|--------|------|-----|
| GET/POST | `/iclock/*` | 10 |
| POST | `/integrations/hanvon/push` | 10 |

### Admin — `/api/admin`, `/api/admin/overview`
| Method | Path | Permission | Doc |
|--------|------|------------|-----|
| GET | `/health` | read.system_health | 11 |
| GET/PATCH | `/feature-flags` | manage.feature_flags | 11, 18 |
| GET/PUT | `/overview/*` (stats, kpi, widgets, table, exports) | read.system_health | 11 |

### Settings — `/api/settings`
| Method | Path | Doc |
|--------|------|-----|
| GET/PATCH | `/` | 12 |

### Activity — `/api/activity`
| Method | Path | Doc |
|--------|------|-----|
| GET | `/me` | 13 |
| GET | `/org` | 13 |
| POST | `/log` | 13 |

### Notifications — `/api/notifications`
| Method | Path | Doc |
|--------|------|-----|
| GET | `/`, `/unread-count` | 16 |
| PATCH | `/read-all`, `/:id/read` | 16 |

### Go-live — `/api/go-live`
| Method | Path | Doc |
|--------|------|-----|
| GET | `/orphan-punches`, `/readiness` | 19 |

---

## Page → Doc Cross-Reference

| Page file | Route | Primary doc |
|-----------|-------|-------------|
| Login.tsx | `/login` | 03 |
| ChangePassword.tsx | `/change-password` | 03 |
| PublicVisitorForm.tsx | `/visit/:slug` | 09 |
| Dashboard.tsx | `/dashboard` | 05, 12 |
| Employees.tsx, EmployeeDetail.tsx | `/employees` | 04 |
| AttendanceLog.tsx | `/attendance` | 05 |
| ComplianceAttendanceLog.tsx | `/compliance-attendance` | 06 |
| Reports.tsx | `/reports` | 05 |
| Adjustments.tsx | `/adjustments` | 06 (compliance UI) |
| Regularization.tsx | `/regularization` | 08 |
| Leave.tsx | `/leave` | 07 |
| Visitors.tsx | `/visitors` | 09 |
| Devices.tsx | `/devices` | 10 |
| ComplianceActivity.tsx | `/compliance-activity` | 13 |
| EmployeeChangeRequests.tsx | `/employee-change-requests` | 04 |
| Settings.tsx / ComplianceSettings.tsx | `/settings` | 12 |
| AutogenerationDemo.tsx | `/autogeneration-demo` | 18 (flag-gated) |
| AdminOverview.tsx | `/admin` | 11 |
| AdminUsers.tsx | `/admin/users` | 11 |
| AdminOrganization.tsx | `/admin/organization` | 11, 12 |
| AdminSecurity.tsx | `/admin/security` | 11 |
| AdminAudit.tsx | `/admin/audit` | 13 |
| AdminSystemHealth.tsx | `/admin/health` | 11 |
| AdminFeatureFlags.tsx | `/admin/feature-flags` | 11, 18 |

---

## Model → Doc Cross-Reference

All 23 Mongoose models documented in [14-data-lifecycles.md](./14-data-lifecycles.md).

---

## Coverage Audit (Verified)

| Check | Count | Status | Reference |
|-------|-------|--------|-----------|
| Route handlers (`router.get/post/patch/delete`) | 152 across 23 route files | ✓ | Appendix above + domain docs `03`–`13`, `19` |
| Page files (`mams-web/src/pages`) | 29 (26 routed + 3 child modals + `_Stub`) | ✓ | [01-module-inventory.md](./01-module-inventory.md) |
| Mongoose models | 23 | ✓ | [14-data-lifecycles.md](./14-data-lifecycles.md) |
| Roles | 4 | ✓ | [02-roles-permissions.md](./02-roles-permissions.md) |
| Permissions | 28 | ✓ | [02-roles-permissions.md](./02-roles-permissions.md) |
| Feature flags | 4 | ✓ | [18-feature-flags-env.md](./18-feature-flags-env.md) |
| Background jobs | 5 | ✓ | [15-background-jobs.md](./15-background-jobs.md) |
| Notification kinds | 3 in-app + 2 email | ✓ | [16-notifications-alerts.md](./16-notifications-alerts.md) |

**Route file index:**

`activity`, `adjustments`, `admin`, `adminOverview`, `attendance`, `auth`, `complianceAttendance`, `csvImport`, `dashboard`, `devices`, `employeeChangeRequests`, `employees`, `essl`, `goLive`, `hanvon`, `leave`, `notifications`, `publicVisitor`, `regularization`, `reports`, `settings`, `users`, `visitors`

**Explicit N/A (not invented):** signup, payments, SMS/push, external object storage.
