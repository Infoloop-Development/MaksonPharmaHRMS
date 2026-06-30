# Dashboard & Settings Workflows

Source: `mams-web/src/pages/Dashboard.tsx`, `mams-web/src/pages/Settings.tsx`, `mams-web/src/pages/ComplianceSettings.tsx`, `mams-server/src/routes/dashboard.routes.ts`, `mams-server/src/routes/settings.routes.ts`.

**viewMode gate:** `SettingsGate` in `App.tsx` renders `ComplianceSettings` when `viewMode === 'compliant'`, else `Settings` (HR Settings).

---

## WORKFLOW: HR Dashboard

**ROLES:** `hr.admin`, `hr.compliance`, `it.admin`, `org.admin` (via HR nav).

**PRECONDITIONS:** Authenticated; attendance visibility depends on `read.real` vs `read.compliant` on JWT.

### STEP 1 — Load dashboard (`/dashboard`)

- **UI:** KPI cards, bar/donut charts, attendance table, week trend sparkline
- **API:**
  - `GET /api/dashboard/stats` → today's present/absent, device counts, pending adjustments
  - `GET /api/dashboard/charts?date=` → chart series
  - `GET /api/dashboard/week-trend` → 7-day present/absent/weekly-off counts
  - `GET /api/dashboard/layout` → user's chart layout
  - `GET /api/dashboard/kpi` → KPI slot configuration
  - `GET /api/dashboard/attendance?date=&department=&…` → paginated rows
- **DB:** `attendancederiveds`, `employees`, `devices`, `adjustments`
- **Projection:** `listDashboardAttendance` uses JWT `viewMode` for real vs compliant entry/exit/hours

### STEP 2 — Filter attendance table

- **UI:** Date, department, status filter (`All` | `Present` | `Absent` | …), shift (`Day` | `Night`)
- **API:** Same `GET /api/dashboard/attendance` with query params (`DashboardAttendanceQuerySchema`)

### STEP 3 — Configure layout (optional)

- **UI:** Drag/reorder chart slots (`bar`, `donut`, `table`)
- **API:** `PUT /api/dashboard/layout` → `DashboardLayoutSchema`
- **DB:** `users.dashboardLayout`
- **Audit:** `dashboard_layout_saved` when slots change

### STEP 4 — Configure KPI slots (optional)

- **API:** `PUT /api/dashboard/kpi` → `DashboardKpiConfigSchema`
- **DB:** `users.dashboardKpi`
- **Audit:** `dashboard_kpi_saved`

### STEP 5 — Export attendance Excel

- **API:** `GET /api/dashboard/attendance.xlsx` (all matching rows, not paginated)
- **Filename:** From `exportNaming` patterns via `buildExportFileName`

**FINAL OUTCOME:** Role-appropriate attendance dashboard with personal layout persistence.

---

## WORKFLOW: HR Settings (`/settings`, real viewMode)

**ROLES:** Any authenticated user for read; write sections gated by permission.

**PRECONDITIONS:** `viewMode !== 'compliant'`.

### Section: Appearance

- **UI:** Theme toggle (`light` | `dark` | `system`)
- **API:** `PATCH /api/auth/preferences` → `themePreference`
- **DB:** `users.themePreference`

### Section: Leave shortcut

- **UI:** Link card to `/leave` (leave config lives on Leave page, not Settings)

### Section: Shifts reference

- **Permission:** `manage.org_settings` to edit
- **API:** `PATCH /api/settings` → `realShifts`, `complianceShifts`, `weeklyOffDefault`
- **Note:** Full org editing also available at Admin → Organization

### Section: My activity

- **UI:** `ActivityLogPanel` — personal audit feed
- **API:** `GET /api/activity/me` (see doc 13)

### Section: Users & roles (embedded panel)

- **Permission:** `manage.org_users` or `manage.users`
- **Same flows as Admin Users** (create, edit, revoke, unmask grants)
- **Also used by:** `AdminUsers.tsx` wrapper

### Section: Organization settings (embedded panel)

- **Permission:** `manage.org_settings`
- **Also used by:** `AdminOrganization.tsx` wrapper
- **Fields:** Company profile, compliance IDs, branding, export naming, notification toggles, smart anchor, confidentiality notice

### Section: Unmask field grants

- **Permission:** `unmask.sensitive` + `isUnmaskEnabled()` feature flag
- **UI:** Per-user grants for sensitive employee fields
- **API:** `PATCH /api/users/:id` → `unmaskFieldGrants`

### Section: Export naming preview

- **Permission:** `manage.export_naming`
- **UI:** Token-based filename patterns per export type; live preview

**FINAL OUTCOME:** HR operators manage day-to-day config; org admins use embedded panels identical to admin console.

---

## WORKFLOW: Compliance Settings (`/settings`, compliant viewMode)

**ROLES:** `hr.compliance` (primary).

**PRECONDITIONS:** `viewMode === 'compliant'`.

### STEP 1 — View profile card

- **UI:** Name, email, role badge (read-only)

### STEP 2 — Change password

- **UI:** Button navigates to `/change-password`
- **API:** `POST /api/auth/change-password` (see doc 03)

**FINAL OUTCOME:** Minimal self-service profile for compliance users; no org-wide settings exposure.

---

## Settings PATCH Permission Matrix

| Field group | Required permission |
|-------------|---------------------|
| Org profile, shifts, branding, logos, notification toggles, smart anchor, confidentiality | `manage.org_settings` or legacy `manage.settings` |
| `exportNaming` only | `manage.export_naming` or `manage.org_settings` |
| `leaveQuotaResetPolicy`, `financialYearStartMonth` | `manage.org_settings` (leave admin context) |

All successful patches emit `settings_changed` audit with `payload.section` derived from `settingsSectionFromChangedFields`.

---

## Settings Singleton Lifecycle

```
[Deploy / first GET] → SettingsModel.findOne() || SettingsModel.create({})
[PATCH] → merge fields → save → audit
[Feature flag PATCH] → may update settings.featureFlags or smartAnchor/confidentiality fields
```

No explicit version field; `orgBranding.updatedAt` / `featureFlags.updatedAt` track branding and runtime flag changes.

---

## User Preference Documents (on `users` collection)

| Field | Scope | Saved via |
|-------|-------|-----------|
| `dashboardLayout` | HR dashboard charts | `PUT /api/dashboard/layout` |
| `dashboardKpi` | HR dashboard KPIs | `PUT /api/dashboard/kpi` |
| `adminOverviewLayout` | Admin overview (legacy layout field) | Admin overview services |
| `adminOverviewKpi` | Admin KPI slots | `PUT /api/admin/overview/kpi` |
| `adminOverviewWidgets` | Admin chart widgets | `PUT /api/admin/overview/widgets` |
| `adminOverviewTable` | Admin table kind/columns | `PUT /api/admin/overview/table-config` |
| `themePreference` | Global UI theme | `PATCH /api/auth/preferences` |
| `completedOnboardingTours` | Onboarding state | `POST /api/auth/onboarding/complete` |

---

## API Summary

### Dashboard — `/api/dashboard`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/stats`, `/charts`, `/week-trend` | Aggregates |
| GET/PUT | `/layout`, `/kpi` | Per-user prefs |
| GET | `/attendance`, `/attendance/departments` | viewMode projection |
| GET | `/attendance.xlsx` | Full export |

### Settings — `/api/settings`

| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Any authenticated user |
| PATCH | `/` | Field-level permission checks |

---

## Cross-References

- Attendance projection rules: [05-attendance-workflows.md](./05-attendance-workflows.md)
- Admin org settings UI duplicate: [11-admin-console-workflows.md](./11-admin-console-workflows.md)
- Activity self-service: [13-activity-audit-workflows.md](./13-activity-audit-workflows.md)
