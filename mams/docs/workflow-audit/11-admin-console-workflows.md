# Admin Console Workflows

Source: `mams-web/src/pages/admin/*`, `mams-web/src/components/admin/*`, `mams-server/src/routes/admin.routes.ts`, `mams-server/src/routes/adminOverview.routes.ts`, `mams-server/src/routes/users.routes.ts`.

**Access:** Routes under `/admin` require JWT auth. `org.admin` is the primary role; sidebar also exposes HR modules for `org.admin` only.

**N/A in MAMS:** public signup; all accounts provisioned via Admin Users or HR Settings user panels.

---

## Admin Navigation

| Route | Page | Permission gate |
|-------|------|-----------------|
| `/admin` | Admin Overview | `read.system_health` (all admin routes) |
| `/admin/users` | Users & roles | `manage.org_users` for mutations |
| `/admin/organization` | Organization | `manage.org_settings` for org fields |
| `/admin/security` | Security & sessions | `manage.security` or `manage.org_users` for revoke |
| `/admin/audit` | Audit log | `read.org_audit` |
| `/admin/health` | System health | `read.system_health` |
| `/admin/feature-flags` | Feature flags | `manage.feature_flags` |

---

## WORKFLOW: Admin Overview Dashboard

**ROLES:** `org.admin` (default home `/admin`).

**PRECONDITIONS:** `read.system_health`; JWT `viewMode` affects attendance projections in tables/charts.

### STEP 1 — Load overview (`/admin`)

- **UI:** KPI grid, custom chart widgets, configurable data table, date picker (7-day window), status/shift filters.
- **API (parallel):**
  - `GET /api/admin/overview/stats` → fleet counts (employees, devices, pending adjustments)
  - `GET /api/admin/overview/analytics?date=` → day-level analytics
  - `GET /api/admin/overview/charts?date=&metric=` → bar/donut chart data
  - `GET /api/admin/overview/kpi` → user's KPI slot config
  - `GET /api/admin/overview/widgets` → user's chart widget config
  - `GET /api/admin/overview/table-config` → table kind + visible columns
  - `GET /api/admin/overview/attendance?date=&page=&…` → attendance rows (requires `read.real` or `read.compliant`)
- **DB:** Reads `employees`, `attendancederiveds`, `devices`, `adjustments`, `users` (layout prefs on `users` document).
- **Success:** Interactive dashboard with optional KPI drill-down filters.

### STEP 2 — Configure KPI slots (optional)

- **UI:** Enter configure mode → pick metrics per slot (`pending_adjustments`, `devices_offline`, etc.).
- **API:** `PUT /api/admin/overview/kpi` → `AdminOverviewKpiConfigSchema`
- **DB:** Writes `users.adminOverviewKpi`
- **Audit:** `admin_overview_kpi_saved` when slots change
- **Success:** KPI grid reflects new metrics.

### STEP 3 — Configure chart widgets (optional)

- **UI:** Add/edit up to `ADMIN_OVERVIEW_WIDGET_MAX` widgets; picker for metric + chart type.
- **API:** `PUT /api/admin/overview/widgets` → `AdminOverviewWidgetsConfigSchema`
- **DB:** Writes `users.adminOverviewWidgets`
- **Audit:** `admin_overview_widgets_saved`

### STEP 4 — Configure data table (optional)

- **UI:** Choose table kind (`attendance` | `users` | `audit` | `devices` | `employees`); column picker.
- **API:** `PUT /api/admin/overview/table-config` → `AdminOverviewTableConfigSchema`
- **DB:** Writes `users.adminOverviewTable`
- **Audit:** `admin_overview_table_saved`
- **Table data APIs** (by kind):
  - `GET /api/admin/overview/attendance` — `read.real` or `read.compliant`
  - `GET /api/admin/overview/users` — `manage.org_users`
  - `GET /api/admin/overview/audit` — `read.org_audit`
  - `GET /api/admin/overview/devices` — `read.system_health`
  - `GET /api/admin/overview/employees` — `read.real` | `read.compliant` | `manage.employees`

### STEP 5 — Export table (optional)

- **UI:** Export button on table toolbar.
- **API:** `GET /api/admin/overview/{kind}.xlsx` with query filters
- **Success:** XLSX download via `adminOverviewExport.service`.

**FINAL OUTCOME:** Org admin has a personalized operational command center with audit trail on layout changes.

---

## WORKFLOW: Users & Roles

**ROLES:** `org.admin` with `manage.org_users`.

**PRECONDITIONS:** Admin Users page reuses `UsersManagementPanel` from `Settings.tsx`.

### STEP 1 — List users

- **API:** `GET /api/users` (requires `manage.org_users` or legacy `manage.users`)
- **DB:** Read `users` collection

### STEP 2 — Create user

- **UI:** Modal with name, email, password, role, optional permission overrides.
- **Validation:** Name ≤120 chars; email (Zod); password 10–128 chars, policy score ≥3.
- **API:** `POST /api/users`
- **DB:** Create `users` row with `passwordHash`, `mustChangePassword: true`, role defaults from `PERMISSIONS_BY_ROLE`
- **Email:** `sendWelcomeUserEmail` if `MAIL_ENABLED=true`; audit `welcome_email_failed` on failure
- **Audit:** `user_created`
- **Business rules:** Only `org.admin` can assign `hr.admin` role
- **Success:** User must change password on first login

### STEP 3 — Edit user

- **API:** `PATCH /api/users/:id`
- **Fields:** role, permissions, `isActive`, `mustChangePassword`, `unmaskFieldGrants`, `viewMode`
- **RBAC:** Non-admins may only patch self (limited fields); org settings changes require `manage.org_users`
- **Audit:** `user_updated`; revokes refresh tokens if RBAC/status/`mustChangePassword` changed

### STEP 4 — Revoke sessions (also on Security page)

- **API:** `POST /api/users/:id/revoke-sessions`
- **Permission:** `manage.security` or `manage.org_users`
- **DB:** Sets `revokedAt` on all active `refreshtokens` for user
- **Audit:** `sessions_revoked`

**FINAL OUTCOME:** Provisioned accounts with enforced first-login password change and optional welcome email.

---

## WORKFLOW: Organization Settings

**ROLES:** `org.admin` with `manage.org_settings`.

**PRECONDITIONS:** Organization page wraps `OrganizationSettingsPanel` from Settings.

### STEP 1 — Load settings

- **API:** `GET /api/settings`
- **DB:** Singleton `settings` document (auto-created if missing)

### STEP 2 — Edit org profile & compliance IDs

- **UI sections:** Company name, registered address, signatory; CIN, GSTIN, PF/ESI/factory licence numbers
- **API:** `PATCH /api/settings` with relevant fields
- **Audit:** `settings_changed` with `payload.section` = `company` or `compliance`

### STEP 3 — Configure shifts & weekly off

- **Fields:** `weeklyOffDefault`, `realShifts`, `complianceShifts` (A/B/C)
- **Validation:** Shift windows `HH:MM` format via Zod
- **Audit section:** `shifts` or `company`

### STEP 4 — Branding & export naming

- **Fields:** `orgBranding`, `companyLogo`, `favicon`, `exportNaming`, `timeFormat`
- **Permissions:** `manage.export_naming` required for `exportNaming` alone
- **Audit sections:** `brand_assets`, `export_naming`, `time_display`

### STEP 5 — Notification alert toggles

- **Fields:** `orgNotificationAlerts` (`visitorSubmitted`, `leaveApplied`, `deviceRegistered`)
- **Effect:** Gates `notifyOrgAdmins` in notification.service (see doc 16)
- **Audit section:** `org_notifications`

**FINAL OUTCOME:** Org-wide configuration persisted in singleton Settings; all changes audit-logged.

---

## WORKFLOW: Security & Sessions

**ROLES:** `org.admin` with `manage.security` or `manage.org_users`.

### STEP 1 — View active accounts

- **UI:** Sortable table: user, role, last login
- **API:** `GET /api/users`

### STEP 2 — Revoke all sessions

- **UI:** Confirm modal per user
- **API:** `POST /api/users/:id/revoke-sessions`
- **Effect:** User signed out everywhere; must re-login
- **Note:** Force password reset via user edit (`mustChangePassword: true`) — documented in UI copy

**FINAL OUTCOME:** Session hygiene without deleting the user account.

---

## WORKFLOW: Organization Audit Log

**ROLES:** `org.admin` with `read.org_audit`.

### STEP 1 — Browse audit events

- **UI:** Category tabs (all, auth, company, users, employees, settings, security); filters for user, role, search
- **API:** `GET /api/activity/org` → `OrgActivityListQuerySchema`
- **DB:** Read `auditlogs` with category filters from `buildCategoryFilter`
- **Pagination:** 50 per page

### STEP 2 — Export Excel

- **API:** `GET /api/admin/overview/audit.xlsx` with same filters
- **Success:** Download audit spreadsheet

**FINAL OUTCOME:** Full org-wide activity visibility for governance.

---

## WORKFLOW: System Health

**ROLES:** `org.admin` with `read.system_health`.

### STEP 1 — View health cards

- **UI:** API status, DB connection, device fleet (online = ping within 15 min)
- **API:** `GET /api/admin/health`
- **Auto-refresh:** Every 60 seconds (client polling)
- **Response fields:** `api`, `dbConnected`, `dbState`, `version`, `timezone`, `devices.{total,online,offline}`, `ts`

**FINAL OUTCOME:** Quick operational health check without SSH access.

---

## WORKFLOW: Feature Flags Console

**ROLES:** `org.admin` with `manage.feature_flags`.

See [18-feature-flags-env.md](./18-feature-flags-env.md) for flag catalog and resolution order.

### STEP 1 — View flags

- **API:** `GET /api/admin/feature-flags`
- **UI:** Summary cards, category filter, risk badges, deploy snippet panel

### STEP 2 — Toggle flag

- **UI:** Toggle switch; high-risk flags (`unmaskEnabled`) require confirmation modal
- **API:** `PATCH /api/admin/feature-flags` → `{ flagId, enabled }` or `{ changes: { … } }`
- **DB:**
  - Runtime flags (`unmaskEnabled`, `autogenDemoEnabled`) → `settings.featureFlags` + in-memory cache
  - Settings-backed flags → direct `settings` fields (`smartAnchorEnabled`, `confidentialityNoticeEnabled`)
- **Audit:** `feature_flags_changed` or `settings_changed` (via feature flags console)
- **Note:** Web flags with `requiresWebRebuild: true` need Netlify env rebuild to sync UI

**FINAL OUTCOME:** Runtime behavior changed without redeploy (except web build flags).

---

## API Summary — Admin Routes

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/admin/health` | `read.system_health` |
| GET/PATCH | `/api/admin/feature-flags` | `manage.feature_flags` |
| GET | `/api/admin/overview/*` | `read.system_health` (+ per-endpoint extras) |
| PUT | `/api/admin/overview/kpi`, `/widgets`, `/table-config` | `read.system_health` |
| GET | `/api/admin/overview/*.xlsx` | Same as list endpoints |

---

## Cross-References

- User provisioning detail: [03-auth-session-onboarding.md](./03-auth-session-onboarding.md)
- Settings field matrix: [12-dashboard-settings-workflows.md](./12-dashboard-settings-workflows.md)
- Audit event types: [13-activity-audit-workflows.md](./13-activity-audit-workflows.md)
- Feature flag resolution: [18-feature-flags-env.md](./18-feature-flags-env.md)
