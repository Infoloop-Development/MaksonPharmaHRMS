# Compliance Attendance Workflows

Source: `mams-server/src/routes/complianceAttendance.routes.ts`, `complianceAutogen.service.ts`, `complianceAttendanceList.service.ts`, `complianceAttendanceUpdate.service.ts`, `complianceHoursAggregate.service.ts`, `reportJob.service.ts`, `shared/types/src/complianceAttendance.ts`, `reportJob.ts`, `complianceDailyGenerator.ts`.

Compliance attendance is a **separate ledger** (`compliance_generated_attendance`) from real derived attendance. It powers the 8-hour compliant view, monthly reports, and financial exports.

---

## Collections

| Collection | Purpose |
|------------|---------|
| `compliance_generated_attendance` | Per employee per IST date: check-in/out, hours, shift, generator version |
| `employees` | Active roster for autogen (`alternateShift`, name sort) |
| `report_jobs` | Async XLSX generation (compliance monthly, financial) |
| `audit_logs` | Manual compliance edits |

---

## Permissions & Role Gates

| Action | Requirement |
|--------|-------------|
| List compliance attendance | `read.compliant` |
| Report jobs (compliance) | `read.compliant` |
| Report jobs (financial) | `read.compliant` + `role === org.admin` |
| Download financial report | `org.admin` only |
| PATCH compliance row | `read.compliant` + `org.admin` |
| Month hours aggregate | `read.compliant` + `org.admin` |
| Trigger autogen (`/generate`, `/generate-month`) | `read.compliant` OR `org.admin` OR `x-cron-secret` header |

---

## Zod Schemas

### List query (route-local `ListQuerySchema`)

| Field | Rules |
|-------|-------|
| `date`, `startDate`, `endDate` | optional IST dates |
| `search` | optional employee text |
| `alternateShift` | `ComplianceShiftSchema` (`A` \| `B` \| `C`) |
| `page` | default 1; `pageSize` 1–500 default 50 |
| `sortBy` | `date`, `name`, `empCode`, `department`, `alternateShift`, `hoursWorked`, `status` |
| `sortDir` | `SortDirSchema` |

### Manual edit (`ComplianceAttendanceUpdateSchema`)

| Field | Rules |
|-------|-------|
| `checkInAt`, `checkOutAt` | ISO datetime optional |
| `hoursWorked` | number ≥ 0 optional |
| `alternateShift` | `A` \| `B` \| `C` optional |
| `adjustmentNote` | **required** string 5–2000 chars |

### Report jobs (`CreateReportJobBodySchema`)

Discriminated union on `type`:

- `compliance_monthly`: `{ type, yearMonth: YYYY-MM, overrides?: [{ employeeId, totalHours }] max 500 }`
- `financial`: `{ type, yearMonth: YYYY-MM }` — org.admin only

---

## Autogen Business Rules (`complianceAutogen.service`)

`runComplianceAutogenForDate(targetDate)`:

1. **Skip Sundays** (`isSundayIstDate`) — returns `{ skippedSunday: true, generated: 0 }`.
2. Load all **Active**, non-deleted employees.
3. Sort by `alternateShift` (A→B→C) then name.
4. For each employee: `generateDailyCompliancePunches({ seedBase: employeeId:date, alternateShift })` — deterministic pseudo-random compliant times (~8h).
5. Upsert `compliance_generated_attendance` with `checkInAt`, `checkOutAt`, `checkOutNextDay`, `hoursWorked`, `status: Present`, `generatorVersion`.
6. Bulk write in batches of 500.

`runComplianceAutogenForMonth(yearMonth)` — iterates weekdays in month, sums results.

**Default date for `/generate`:** `yesterdayIstDateString()` if `date` query omitted.

**Cron auth:** Header `x-cron-secret` must match `COMPLIANCE_AUTOGEN_CRON_SECRET` env.

---

## WORKFLOW: View Compliance Attendance List

**ROLES:** `hr.compliance`, `org.admin` (with `read.compliant`).

**PRECONDITIONS:** Permission `read.compliant`.

### STEP 1 — Compliance attendance page

- **UI:** Date range, shift filter, search, sort, pagination.
- **API:** `GET /api/compliance-attendance?` + list query
  - Response: paginated rows from `listComplianceGeneratedAttendance` (employee populate, hours, status)
- **DB:** Read `compliance_generated_attendance`.
- **Errors:** 403 forbidden; 400 Zod

**FINAL OUTCOME:** Compliant 8h ledger for audit review.

---

## WORKFLOW: Daily / Monthly Autogen

**ROLES:** Compliance auditor, org admin, or cron job.

### STEP 1 — Generate single day

- **API:** `POST /api/compliance-attendance/generate?date=YYYY-MM-DD`
  - Default date: yesterday IST
  - Response: `ComplianceAutogenResult` — `{ date, skippedSunday, generated, errors }`

### STEP 2 — Generate full month

- **API:** `POST /api/compliance-attendance/generate-month?yearMonth=YYYY-MM`
  - Response: `{ yearMonth, weekdaysProcessed, generated, errors }`

- **DB:** Upsert `compliance_generated_attendance` for each active employee per weekday.
- **Errors:**
  - 403 `forbidden` — not allowed to trigger
  - 400 `invalid_date` / `invalid_month`

**FINAL OUTCOME:** Synthetic compliant attendance populated for reporting.

---

## WORKFLOW: Manual Compliance Correction

**ROLES:** `org.admin` only.

**PRECONDITIONS:** `read.compliant` + org admin role check.

### STEP 1 — Edit row in compliance grid

- **UI:** Adjust check-in/out, hours, shift; mandatory adjustment note.
- **API:** `PATCH /api/compliance-attendance/:id`
  - Body: `ComplianceAttendanceUpdateSchema`
  - Response: updated record
- **DB:** Update `compliance_generated_attendance`; audit with note and actor.
- **Errors:** 400 `invalid_id`; 403 forbidden; 404 not found (service-level)

**FINAL OUTCOME:** Manually corrected compliant record with audit trail.

---

## WORKFLOW: Compliance Monthly Report (Async Job)

**ROLES:** `read.compliant`.

**PRECONDITIONS:** Deprecated sync endpoints return 410.

### STEP 1 — Enqueue job

- **API:** `POST /api/compliance-attendance/report-jobs`
  - Body: `{ type: "compliance_monthly", yearMonth: "YYYY-MM", overrides?: [...] }`
  - Response 202: `{ jobId, status: "queued" }`

### STEP 2 — Poll status

- **API:** `GET /api/compliance-attendance/report-jobs/:id`
  - Response: `ReportJobStatusResponse` — status, progress, filename, errorMessage

### STEP 3 — Download

- **API:** `GET /api/compliance-attendance/report-jobs/:id/download`
  - Response: XLSX attachment

- **DB:** `report_jobs` collection; file buffer stored until download.
- **Errors:** 403 for financial type without org.admin; job failed state in poll response

**FINAL OUTCOME:** Downloadable monthly compliance XLSX.

---

## WORKFLOW: Financial Report (Org Admin)

**ROLES:** `org.admin` with `read.compliant`.

### STEP 1 — Enqueue financial job

- **API:** `POST /api/compliance-attendance/report-jobs`
  - Body: `{ type: "financial", yearMonth: "YYYY-MM" }`
  - Response 202: job created

### STEP 2 — Poll and download

- Same as compliance job; download endpoint enforces org.admin.

**Deprecated:** `POST /compliance-attendance/report.xlsx` and `POST /financial-report.xlsx` return **410** with message to use report-jobs.

**FINAL OUTCOME:** Financial XLSX for org admin only.

---

## WORKFLOW: Month Hours Lookup

**ROLES:** `org.admin`.

### STEP 1 — Employee month total

- **API:** `GET /api/compliance-attendance/month-hours?employeeId=&yearMonth=YYYY-MM`
  - Response: `{ complianceHours: number }`
- **Errors:** 400 `invalid_query` if params missing/invalid

**FINAL OUTCOME:** Aggregate compliant hours for one employee-month.

---

## API Summary

| Method | Path | Gate |
|--------|------|------|
| GET | `/api/compliance-attendance` | read.compliant |
| POST | `/api/compliance-attendance/generate` | read.compliant / cron / org.admin |
| POST | `/api/compliance-attendance/generate-month` | same |
| PATCH | `/api/compliance-attendance/:id` | read.compliant + org.admin |
| GET | `/api/compliance-attendance/month-hours` | read.compliant + org.admin |
| POST | `/api/compliance-attendance/report-jobs` | read.compliant (+ type gate) |
| GET | `/api/compliance-attendance/report-jobs/:id` | read.compliant |
| GET | `/api/compliance-attendance/report-jobs/:id/download` | read.compliant (+ financial gate) |
| POST | `/api/compliance-attendance/report.xlsx` | 410 deprecated |
| POST | `/api/compliance-attendance/financial-report.xlsx` | 410 deprecated |

---

## Relationship to Real Attendance

| Aspect | `attendance_derived` | `compliance_generated_attendance` |
|--------|----------------------|-----------------------------------|
| Source | Real device punches + regularization | Autogen algorithm + manual edits |
| Primary users | HR operations (`read.real`) | Compliance audit (`read.compliant`) |
| Hours model | 12h real + smartAnchor compliant column | Fixed ~8h compliant ledger |
| Sunday | From actual punches / weekly off | Autogen skips generation |

Both respect IST calendar dates and employee `alternateShift` (A/B/C) for compliant logic.
