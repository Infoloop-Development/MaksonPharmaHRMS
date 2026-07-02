# Activity & Audit Workflows

Source: `mams-server/src/services/activity.service.ts`, `mams-server/src/services/audit.service.ts`, `mams-server/src/routes/activity.routes.ts`, `mams-web/src/components/activity/*`, `mams-web/src/pages/ComplianceActivity.tsx`, `mams-web/src/pages/admin/AdminAudit.tsx`.

**Storage:** All audit events persist to `auditlogs` collection (`AuditLog` model, append-only).

---

## Audit Event Pipeline

```
[HTTP handler / service] → audit(eventType, ctx, { entityType?, entityId?, payload? })
                        → AuditLogModel.create({ occurredAt, userId, ipAddress, userAgent, … })
```

**Context (`ctx`):** `userId`, `ipAddress` (from `requestContext` middleware), `userAgent`.

---

## WORKFLOW: My Activity (Self-Service)

**ROLES:** Any authenticated user.

**PRECONDITIONS:** None.

### STEP 1 — Open activity panel

- **UI locations:**
  - HR Settings → "My activity" (`ActivityLogPanel`)
  - Potentially other pages posting UI events
- **API:** `GET /api/activity/me` → `ActivityListQuerySchema` (`page`, `pageSize`, optional `unreadOnly` N/A here)
- **DB:** `auditlogs` where `userId` = current user
- **Exclusions (`hiddenSelfServiceEventTypes`):**
  - Always: `login_failed`, `welcome_email_failed`
  - When unmask disabled: `unmask_succeeded`, `unmask_failed`
- **CSV import filter:** Failed imports (`successCount: 0`) hidden from self-service view

### STEP 2 — Paginate results

- **Default:** Page 1, pageSize 20
- **Sort:** `occurredAt` descending
- **Response:** `{ items, total, page, pageSize }` — items lack actor enrichment (always self)

**FINAL OUTCOME:** User sees their own actions without security noise.

---

## WORKFLOW: Organization Audit Log

**ROLES:** `org.admin` with `read.org_audit`.

**PRECONDITIONS:** Admin → Audit (`/admin/audit`).

### STEP 1 — Filter events

- **UI:** Category tabs, search, user select, role filter
- **API:** `GET /api/activity/org` → `OrgActivityListQuerySchema`
- **Query params:** `page`, `pageSize`, `category`, `eventType`, `userId`, `role`, `from`, `to`, `search`
- **Category filters** (`buildCategoryFilter`):

| Category | Event types / payload |
|----------|----------------------|
| `auth` | `login`, `logout`, `password_changed` |
| `company` | `settings_changed` where `section` ∈ company, compliance, brand_assets |
| `users` | `user_created`, `user_updated`, `sessions_revoked` |
| `employees` | `employee_created`, `employee_updated`, `employee_deleted`, `csv_import` |
| `settings` | `feature_flags_changed`; other `settings_changed` |
| `security` | `unmask_succeeded`, `unmask_failed`, `login_failed` |

- **Exclusions (`hiddenOrgEventTypes`):** `welcome_email_failed`; unmask events when flag off
- **Actor enrichment:** Joins `users` for `userName`, `userEmail`, `userRole` per row

### STEP 2 — Export Excel

- **API:** `GET /api/admin/overview/audit.xlsx` with filter query params
- **Permission:** `read.org_audit`

**FINAL OUTCOME:** Governance-grade org-wide audit trail with export.

---

## WORKFLOW: Compliance Activity Log

**ROLES:** Users with `read.compliance_activity`.

**PRECONDITIONS:** `/compliance-activity` route.

### STEP 1 — View compliance-scoped activity

- **UI:** Category tabs + search (no user/role filters)
- **API:** `GET /api/activity/org` with **hardcoded** `role: 'hr.compliance'`
- **Server behavior:**
  - If caller lacks `read.org_audit`, route forces `q.role = 'hr.compliance'` (activity.routes.ts)
  - Filters `auditlogs.userId` to users with `role: 'hr.compliance'`
- **Use case:** Compliance team sees only actions performed by compliance logins

### STEP 2 — Paginate (50 per page)

- Same `AuditLogResults` component as admin audit

**FINAL OUTCOME:** Scoped visibility for compliance operations without full org audit access.

---

## WORKFLOW: Client-Side UI Activity Logging

**ROLES:** Any authenticated user.

**PRECONDITIONS:** Rate limit: 40 POST/min per user.

### STEP 1 — Client emits UI event

- **API:** `POST /api/activity/log` → `UiActivityLogBodySchema`
- **Body:** `eventType`, `page`, `action`, optional `payload` (≤4KB)
- **Validation:** `assertUiPayloadSize` — max 4096 bytes JSON
- **Audit:** Stored as provided `eventType` with payload `{ page, action, … }`

**FINAL OUTCOME:** Product analytics / tour completion / UI actions captured in audit log.

---

## Settings Change Auditing

`PATCH /api/settings` and feature-flag console both produce structured diffs:

```json
{
  "eventType": "settings_changed",
  "payload": {
    "before": { … },
    "after": { … },
    "changedFields": ["companyName", …],
    "section": "company"
  }
}
```

**Section mapping** (`settingsSectionFromChangedFields`): `company`, `compliance`, `brand_assets`, `export_naming`, `smart_anchor`, `confidentiality`, `org_notifications`, `time_display`, `shifts`, `settings`.

---

## Dashboard / Admin Layout Audits

| Event type | Trigger |
|------------|---------|
| `dashboard_layout_saved` | `PUT /api/dashboard/layout` |
| `dashboard_kpi_saved` | `PUT /api/dashboard/kpi` |
| `admin_overview_kpi_saved` | `PUT /api/admin/overview/kpi` |
| `admin_overview_widgets_saved` | `PUT /api/admin/overview/widgets` |
| `admin_overview_table_saved` | `PUT /api/admin/overview/table-config` |

Payloads include before/after config snapshots via `dashboardActivity.service` / `adminOverviewActivity.service`.

---

## Representative Event Types (non-exhaustive)

| Event type | Typical source |
|------------|----------------|
| `login`, `login_failed`, `logout`, `password_changed` | auth.service |
| `user_created`, `user_updated`, `sessions_revoked` | users.routes |
| `employee_created`, `employee_updated`, `employee_deleted` | employee.service |
| `csv_import` | employees import |
| `settings_changed` | settings.routes, feature flags (settings-backed) |
| `feature_flags_changed` | featureFlags.service (runtime flags) |
| `unmask_succeeded`, `unmask_failed` | employees unmask |
| `adjustment_*`, `regularization_*`, `leave_*` | respective route handlers |
| `visitor_*` | visitor routes |
| `device_*` | devices.routes |
| `compliance_autogen_*` | compliance autogen (if audited) |
| `welcome_email_failed` | users.routes (hidden from UI lists) |

---

## API Summary — `/api/activity`

| Method | Path | Permission | Doc section |
|--------|------|------------|-------------|
| GET | `/me` | Auth only | My Activity |
| GET | `/org` | `read.org_audit` OR `read.compliance_activity` | Org / Compliance |
| POST | `/log` | Auth + rate limit | UI logging |

---

## Indexes (query performance)

- `{ userId: 1, occurredAt: -1 }`
- `{ entityType: 1, entityId: 1, occurredAt: -1 }`
- `eventType`, `occurredAt` field indexes

---

## Cross-References

- Admin audit UI: [11-admin-console-workflows.md](./11-admin-console-workflows.md)
- Unmask audit (separate collection): [14-data-lifecycles.md](./14-data-lifecycles.md) — `UnmaskAudit`
- Rate limit on `/log`: [19-edge-cases-retries.md](./19-edge-cases-retries.md)
