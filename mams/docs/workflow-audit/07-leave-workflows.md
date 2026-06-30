# Leave Workflows

Source: `mams-server/src/routes/leave.routes.ts`, `shared/types/src/leave.ts`, `permissionHelpers.ts`, services under `mams-server/src/services/leave/`.

---

## Collections

| Collection | Purpose |
|------------|---------|
| `leave_types` | Configurable leave categories (paid, quota, half-day rules) |
| `holidays` | Calendar holidays (optional dept/location scope) |
| `leave_applications` | Applications with status workflow |
| `leave_quotas` | Per employee / leave type / period balances |
| `leave_quota_ledger` | Audit trail of quota consumption/restoration |
| `employees` | Department, location for holiday matching |
| `settings` | `leaveQuotaResetPolicy`, `financialYearStartMonth` |
| `audit_logs` | leave_applied, approved, rejected, cancelled, type/holiday/quota events |

---

## Permissions

| Action | Permission |
|--------|------------|
| View summary, types, holidays, applications, quota | Auth (list endpoints); helpers: `canViewLeave` |
| Apply for leave | `write.leave` OR `manage.leave` |
| Approve / reject / cancel | `approve.leave` OR `manage.leave` |
| Manage types, holidays, quota, policy | `manage.leave` |
| Auto-approve on create (`adminApply: true`) | Requires `approve.leave` or `manage.leave` (`resolveLeaveAdminApply`) |

---

## Zod Schemas

### Leave types

| Schema | Key rules |
|--------|-----------|
| `LeaveTypeCreateSchema` | `code` lowercase+underscore; `name`; `paid`, `halfDayEligible`, `maxConsecutiveDays?`, `requiresDocument`, `annualQuotaDefault`, `active`, `sortOrder` |
| `LeaveTypePatchSchema` | Partial omit `code` |

### Holidays

| Schema | Key rules |
|--------|-----------|
| `HolidayCreateSchema` | `name`, `date` YYYY-MM-DD, `type` National/Regional/Company, `departments[]`, `locations[]` |
| `HolidayPatchSchema` | Partial |

### Applications

| Schema | Key rules |
|--------|-----------|
| `LeaveApplicationCreateSchema` | `employeeId`, `leaveTypeId`, `fromDate`, `toDate`, `halfDayPortion?` first/second, `reason` 1–2000, `notifyEmployee` default false, `adminApply` default true; `fromDate <= toDate`; half-day requires single date |
| `LeaveDecisionSchema` | `note?` max 2000 |
| `LeaveRejectSchema` | `note` required min 1 |
| `LeaveListQuerySchema` | filters + pagination; `sortBy` employee/fromDate/totalDays/status |

### Quota

| Schema | Key rules |
|--------|-----------|
| `LeaveQuotaAdjustSchema` | `employeeId`, `leaveTypeId`, `delta` number, `reason` 1–500 |
| `LeaveQuotaApplyDefaultSchema` | `employeeIds?` or `department?` |
| `LeaveQuotaPreviewQuerySchema` | `employeeId`, `leaveTypeId`, `asOfDate?` |

### Status enum

`Pending` | `Approved` | `Rejected` | `Cancelled`

---

## Business Rules

### Day calculation (`leaveDayCalculator.service`)

- **Full days:** Count dates in range excluding holidays that apply to employee's department AND location (empty holiday scope = applies to all).
- **Half day:** `totalDays = 0.5` if single date not a holiday; else 0.
- **Paid leave with 0 chargeable days:** Rejected with `no_leave_days`.

### Overlap (`leaveOverlap.service`)

- Cannot apply if overlapping non-cancelled/rejected leave exists for same employee.

### Quota (`leaveQuota.service`)

- **On approve** (immediate or later): `consumeQuotaForLeave` — decrements remaining for paid types.
- **On cancel** (was approved): `restoreQuotaForLeave`.
- **Manual adjust:** `applyQuotaDelta` with ledger entry.

### Admin apply (`resolveLeaveAdminApply`)

- If `adminApply: true` but user lacks approve permission → 403.
- If allowed: status `Approved` on create, quota consumed immediately, `decidedBy`/`decidedAt` set.

### Notifications

- `notifyEmployee` flag triggers employee notification service.
- All applications notify org admins via `notifyOrgAdmins`.

### Default leave types (`DEFAULT_LEAVE_TYPES`)

Paid Leave (12/yr), LWP, Casual (6/yr), Sick (6/yr, requires document) — seed via `POST /types/seed-defaults` if collection empty.

---

## WORKFLOW: Configure Leave Types

**ROLES:** `manage.leave` (typically `hr.admin`, `it.admin`).

### STEP 1 — List types

- **API:** `GET /api/leave/types` → `{ items: LeaveTypePublic[] }`

### STEP 2 — Create / update

- **API:** `POST /api/leave/types` — body `LeaveTypeCreateSchema` → 201
- **API:** `PATCH /api/leave/types/:id` — body `LeaveTypePatchSchema`

### STEP 3 — Seed defaults (dev)

- **API:** `POST /api/leave/types/seed-defaults` — no-op if types exist

**FINAL OUTCOME:** Active leave catalog for applications.

---

## WORKFLOW: Manage Holidays

**ROLES:** `manage.leave`.

### STEP 1 — List

- **API:** `GET /api/leave/holidays?year=YYYY`

### STEP 2 — CRUD

- **POST** `/api/leave/holidays` — `HolidayCreateSchema`
- **PATCH** `/api/leave/holidays/:id`
- **DELETE** `/api/leave/holidays/:id` → 204

### STEP 3 — Bulk import

- **POST** `/api/leave/holidays/import-csv` — body `{ rows: HolidayCreateSchema[] }` min 1

**FINAL OUTCOME:** Holiday calendar drives leave day exclusion.

---

## WORKFLOW: Apply for Leave

**ROLES:** `write.leave` or `manage.leave`.

**PRECONDITIONS:** Active leave type; valid employee; no overlap.

### STEP 1 — Quota preview (optional)

- **API:** `GET /api/leave/quota/preview?employeeId=&leaveTypeId=&asOfDate=`
  - Response: balance + `paid`, `leaveTypeName`

### STEP 2 — Submit application

- **UI:** Employee, type, dates, half-day, reason, notify toggle, admin auto-approve toggle.
- **API:** `POST /api/leave/applications`
  - Body: `LeaveApplicationCreateSchema`
  - Response 201: populated application
- **DB:** Create `leave_applications`; if Approved → consume quota; audit `leave_applied`.
- **Business rules:** Max consecutive check; half-day eligibility; overlap check; holiday exclusion for `totalDays`.
- **Errors:**
  - 403 `forbidden` — adminApply without approve perm
  - 400 `half_day_not_allowed`, `max_consecutive`, `no_leave_days`
  - 404 employee/type not found
  - 409 `overlap`

**FINAL OUTCOME:** `Pending` or `Approved` application; admins notified.

---

## WORKFLOW: Approve Leave

**ROLES:** `approve.leave` or `manage.leave`.

### STEP 1 — Approve pending application

- **API:** `PATCH /api/leave/applications/:id/approve`
  - Body: `LeaveDecisionSchema` (`note?`)
- **DB:** status `Approved`; `consumeQuotaForLeave`; audit `leave_approved`.
- **Errors:** 400 `invalid_status` if not Pending; 404 not found

**FINAL OUTCOME:** Approved leave; quota consumed.

---

## WORKFLOW: Reject Leave

**ROLES:** `approve.leave`.

### STEP 1 — Reject with reason

- **API:** `PATCH /api/leave/applications/:id/reject`
  - Body: `LeaveRejectSchema` — note required
- **DB:** status `Rejected`; audit `leave_rejected`.

**FINAL OUTCOME:** Application rejected; no quota impact.

---

## WORKFLOW: Cancel Leave

**ROLES:** `approve.leave`.

### STEP 1 — Cancel pending or approved

- **API:** `PATCH /api/leave/applications/:id/cancel`
  - Body: `LeaveDecisionSchema`
- **DB:** status `Cancelled`; if was Approved → `restoreQuotaForLeave`.
- **Errors:** 400 `invalid_status` for Rejected/Cancelled already

**FINAL OUTCOME:** Leave voided; quota restored if previously approved.

---

## WORKFLOW: List & Export Applications

**ROLES:** Authenticated (typically HR).

### STEP 1 — List with filters

- **API:** `GET /api/leave/applications?status=&employeeId=&search=&...`
  - Special sort `sortBy=employee` uses aggregation on employee name.

### STEP 2 — Detail with ledger

- **API:** `GET /api/leave/applications/:id` — includes last 10 quota ledger entries

### STEP 3 — Export

- **GET** `/api/leave/applications/export.xlsx` — up to 5000 rows, branded filename
- **GET** `/api/leave/applications/export.csv` — CSV with preamble/footer branding

**FINAL OUTCOME:** Operational leave register.

---

## WORKFLOW: Quota Management

**ROLES:** `manage.leave`.

### STEP 1 — List quotas

- **API:** `GET /api/leave/quota?employeeId=` — remaining = entitled + manualAdjustment - consumed

### STEP 2 — Manual adjustment

- **API:** `POST /api/leave/quota/adjust` — `LeaveQuotaAdjustSchema`

### STEP 3 — Apply default policy to cohort

- **API:** `POST /api/leave/quota/apply-default-policy` — by employeeIds or department

### STEP 4 — Policy settings

- **GET** `/api/leave/settings/policy` — reset policy + FY start month
- **PATCH** `/api/leave/settings/policy` — `leaveQuotaResetPolicy`: calendar_year | financial_year | joining_anniversary; `financialYearStartMonth` 1–12

**FINAL OUTCOME:** Quota balances aligned with org policy.

---

## WORKFLOW: Leave Dashboard Summary

**ROLES:** Authenticated.

- **API:** `GET /api/leave/summary` — aggregated KPIs from `getLeaveSummary()`

---

## API Summary

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/leave/summary` | Auth |
| GET/POST | `/api/leave/types` | Auth / manage.leave |
| PATCH | `/api/leave/types/:id` | manage.leave |
| POST | `/api/leave/types/seed-defaults` | manage.leave |
| GET/POST/PATCH/DELETE | `/api/leave/holidays` | Auth / manage.leave |
| POST | `/api/leave/holidays/import-csv` | manage.leave |
| GET | `/api/leave/quota/preview` | Auth |
| GET | `/api/leave/quota` | Auth |
| POST | `/api/leave/quota/adjust` | manage.leave |
| POST | `/api/leave/quota/apply-default-policy` | manage.leave |
| GET/POST | `/api/leave/applications` | Auth / write.leave |
| GET | `/api/leave/applications/:id` | Auth |
| PATCH | `/api/leave/applications/:id/approve` | approve.leave |
| PATCH | `/api/leave/applications/:id/reject` | approve.leave |
| PATCH | `/api/leave/applications/:id/cancel` | approve.leave |
| GET | `/api/leave/applications/export.xlsx` | Auth |
| GET | `/api/leave/applications/export.csv` | Auth |
| GET/PATCH | `/api/leave/settings/policy` | Auth / manage.leave |

---

## IST Convention

`fromDate`, `toDate`, holiday `date`, and quota `asOfDate` use **YYYY-MM-DD** IST calendar dates.
