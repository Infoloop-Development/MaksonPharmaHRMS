# Employees Workflows

Source: `mams-server/src/routes/employees.routes.ts`, `employeeChangeRequests.routes.ts`, `csvImport.routes.ts`, `shared/types/src/employee.ts`, `employeeChangeRequest.ts`, `sensitiveUnmask.ts`, `mams-server/src/services/employee.service.ts`, `employeeCode.service.ts`.

---

## Collections

| Collection | Purpose |
|------------|---------|
| `employees` | Master employee records (soft-delete via `isDeleted`) |
| `employee_change_requests` | Compliance-gated create/update/delete proposals |
| `employee_code_sequences` | Monotonic `MKS####` allocation (via `employeeCode.service`) |
| `audit_logs` | `employee_created`, `employee_updated`, `employee_deleted`, `csv_import`, change-request events, unmask events |

---

## Permissions

| Action | Permission |
|--------|------------|
| List / view masked employee | Auth only (any logged-in user) |
| Create / update / delete / CSV import | `manage.employees` OR `manage.users` |
| Submit change request | `write.employee_change` |
| Approve/reject change request | `approve.employee_change` |
| Unmask sensitive field | `unmask.sensitive` + per-user `unmaskFieldGrants` + feature flag |

**viewMode note:** In `compliant` viewMode, `timeShift` is omitted from API responses; `alternateShift` (A/B/C) is always shown.

---

## Zod Schemas

### Employee CRUD (`employee.ts`)

| Schema | Rules |
|--------|-------|
| `EmployeeCreateBodySchema` | All fields except `empCode` (server-allocated). Includes `SensitiveFieldsSchema`: PAN (`^[A-Z]{5}[0-9]{4}[A-Z]$`), Aadhaar (12 digits), bank account (9–18 digits), IFSC, PF, ESI, etc. |
| `EmployeePatchBodySchema` | Partial of create body; `empCode` never patchable |
| `EmployeeListQuerySchema` | `search`, `department`, `location`, `status`, `page` (default 1), `pageSize` (1–200, default 50), `sortBy`, `sortDir` |
| `EMP_CODE_REGEX` | `^MKS\d{4}$` |
| `TimeShiftSchema` | `Day` \| `Night` |
| `ComplianceShiftSchema` | `A` \| `B` \| `C` |
| `WeekdaySchema` | Monday–Sunday; `weeklyOff` array min 1 max 2 |

### CSV import (`csvImport.routes.ts` — local `RowSchema`)

Same fields as template header; `weeklyOff` semicolon-separated (`Sunday` or `Sunday;Saturday`); `joinDate` `YYYY-MM-DD`.

### Change requests (`employeeChangeRequest.ts`)

| Schema | Rules |
|--------|-------|
| `EmployeeChangeRequestBodySchema` | Discriminated union on `changeType`: `create` \| `update` \| `delete`; `reason` 10–2000 chars; `update`/`delete` require `employeeId` |
| `EmployeeChangeRequestProposedSchema` | Profile + optional sensitive fields (strings, not full validation until approval path) |
| `EmployeeChangeRequestDecisionSchema` | `decision`: `approve` \| `reject`; `approverNote?`; `timeShift?` (`Day`/`Night`) required on approve-create |
| `EmployeeChangeRequestListQuerySchema` | `status`, `changeType`, `employeeId`, pagination |

### Unmask (`employees.routes.ts` — inline)

```typescript
{ field: SensitiveUnmaskFieldSchema, password: string.min(1), reason?: string }
```

`SensitiveUnmaskFieldSchema`: `pan`, `aadhaar`, `bankAccountNumber`, `pfNumber`, `esiNumber`, `ifsc`, `bankName`, `accountHolderName`, `accountType`.

---

## WORKFLOW: List & Search Employees

**ROLES:** Any authenticated user.

**PRECONDITIONS:** Bearer token.

### STEP 1 — Employees page

- **UI:** Search, department/location/status filters, pagination, sort.
- **API:** `GET /api/employees?search=&department=&location=&status=&page=&pageSize=&sortBy=&sortDir=`
  - Response: `{ items: EmployeeMasked[], total, page, pageSize }`
- **DB:** Query `employees` where `isDeleted != true`; regex search on `name`, `empCode`, `biometricId`.
- **Business rules:** `toMaskedEmployee()` masks sensitive fields (last-4 / Aadhaar format); compliant viewMode hides `timeShift`.
- **Errors:** 401 unauthenticated; 400 Zod on query

**FINAL OUTCOME:** Paginated masked employee list.

---

## WORKFLOW: View Single Employee

**ROLES:** Any authenticated user.

### STEP 1 — Employee detail drawer/page

- **API:** `GET /api/employees/:id`
  - Response: `EmployeeMasked`
- **DB:** Read `employees` by ObjectId; 404 if missing or `isDeleted`.
- **Errors:** 404 `not_found` — "Employee not found"

**FINAL OUTCOME:** Masked employee detail.

---

## WORKFLOW: Create Employee (Direct HR Path)

**ROLES:** `hr.admin`, `org.admin` (with `manage.employees`).

**PRECONDITIONS:** `manage.employees` or `manage.users`.

### STEP 1 — Preview next code (optional)

- **API:** `GET /api/employees/next-code`
  - Response: `{ nextEmpCode: "MKS0001" }`

### STEP 2 — Create form (wizard step 1 + statutory/bank)

- **UI:** `EmployeeCreateStep1Schema` fields + sensitive fields; server assigns `empCode`.
- **API:** `POST /api/employees`
  - Body: `EmployeeCreateBodySchema`
  - Response 201: `EmployeeMasked`
- **DB:** `allocateNextEmpCode()` → `employees.create`; audit `employee_created`.
- **Business rules:** Unique indexes on `empCode`, `biometricId` (duplicate → mapped ApiError).
- **Errors:**
  - 403 forbidden
  - 409 duplicate emp code / biometric ID
  - 400 Zod validation (PAN, Aadhaar, etc.)

**FINAL OUTCOME:** New active employee with server-assigned `MKS####` code.

---

## WORKFLOW: Update Employee

**ROLES:** `manage.employees`.

### STEP 1 — Edit employee

- **API:** `PATCH /api/employees/:id`
  - Body: `EmployeePatchBodySchema`
  - Response: updated `EmployeeMasked`
- **DB:** `$set` partial fields; `joinDate` converted to Date; audit `employee_updated` with `changedFields`.
- **Errors:** 404 not found; 409 duplicate biometric; 403 forbidden

**FINAL OUTCOME:** Employee record updated.

---

## WORKFLOW: Soft Delete Employee

**ROLES:** `manage.employees`.

### STEP 1 — Delete confirmation

- **API:** `DELETE /api/employees/:id`
  - Response: 204
- **DB:** `isDeleted=true`, `status='Inactive'`; audit `employee_deleted`.
- **Errors:** 404 not found

**FINAL OUTCOME:** Employee hidden from lists; not physically removed.

---

## WORKFLOW: Unmask Sensitive Field

**ROLES:** User with `unmask.sensitive`, grant for field, unmask feature flag enabled.

**PRECONDITIONS:** `isUnmaskEnabled()` runtime flag.

### STEP 1 — Unmask dialog

- **UI:** Select field, re-enter password, optional reason.
- **API:** `POST /api/employees/:id/unmask`
  - Body: `{ field, password, reason? }`
  - Response: `{ field, value, unmaskedAt }`
- **DB:** Read employee; audit unmask success/failure (password/grant failures logged).
- **Business rules:** `bcrypt.compare` on actor password; `userHasUnmaskGrant(actor, field)`.
- **Errors:**
  - 404 `feature_disabled` / `not_found`
  - 401 `invalid_credentials` — incorrect password
  - 403 `forbidden` — no grant for field

**FINAL OUTCOME:** Plain-text value returned once; fully audit-logged.

---

## WORKFLOW: CSV Bulk Import

**ROLES:** `manage.employees`.

### STEP 1 — Download template

- **API:** `GET /api/employees/import-csv/template`
  - Response: CSV attachment `mams-employee-import-template.csv` (UTF-8 BOM)
- **Columns:** empCode, name, gender, department, designation, location, timeShift, alternateShift, weeklyOff, joinDate, biometricId, pan, aadhaar, bank fields, pfNumber, esiNumber, status

### STEP 2 — Upload CSV

- **API:** `POST /api/employees/import-csv`
  - Content-Type: raw text body (max 10MB)
  - Response: `{ totalRows, successCount, duplicateCount, invalidCount, errors[] }`
- **DB:** Per valid row `employees.create`; on any success `syncEmployeeCodeSequenceFromDb()`; audit `csv_import`.
- **Business rules:** Header must include all template columns; row-level Zod + duplicate checks for `empCode` and `biometricId`.
- **Errors:**
  - 400 `empty_or_no_data`
  - 400 `missing_columns`
  - Per-row errors in response (no abort)

**FINAL OUTCOME:** Batch insert report; valid rows persisted.

---

## WORKFLOW: Employee Change Request (Compliance Path)

**ROLES:** Submit — `write.employee_change` (default `hr.compliance`). Decide — `approve.employee_change`.

**PRECONDITIONS:** Compliant users listing requests only see their own (`initiatedBy` filter when `viewMode=compliant`).

### STEP 1 — Submit request

- **UI:** Change type create/update/delete, proposed data, reason (min 10 chars).
- **API:** `POST /api/employee-change-requests`
  - Body: `EmployeeChangeRequestBodySchema`
  - Response 201: created document
- **DB:** `employee_change_requests` status `Pending`; snapshot `previousData` for update/delete.
- **Business rules:** Only one pending request per employee; update/delete require valid active employee.
- **Errors:**
  - 400 `invalid_employee`
  - 404 `not_found`
  - 409 `duplicate_pending`

### STEP 2 — List / review queue

- **API:** `GET /api/employee-change-requests?status=&changeType=&employeeId=&page=`
  - Response: `{ items, total, page, pageSize, counts: { Pending, Approved, Rejected } }`

### STEP 3 — Approve or reject

- **API:** `POST /api/employee-change-requests/:id/decide`
  - Body: `EmployeeChangeRequestDecisionSchema`
- **Branch A — Approve create:** Requires `timeShift` in body; `allocateNextEmpCode()`; creates employee from `proposedData`.
- **Branch B — Approve update:** Patches employee; optional `timeShift` override; sensitive fields only if present in proposed.
- **Branch C — Approve delete:** `isDeleted=true`, `deletedAt`, `status=Inactive`.
- **Branch D — Reject:** Status `Rejected`; no employee mutation.
- **DB:** Update request with `decidedBy`, `decidedAt`, `approverNote`; audit approved/rejected.
- **Errors:**
  - 404 pending request not found
  - 400 `missing_time_shift` on approve-create without `timeShift`
  - 400 `missing_employee`

**FINAL OUTCOME:** Compliance-approved changes materialized in `employees`; audit trail preserved.

---

## API Summary

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/employees` | Auth |
| GET | `/api/employees/next-code` | manage.employees |
| GET | `/api/employees/:id` | Auth |
| POST | `/api/employees` | manage.employees |
| PATCH | `/api/employees/:id` | manage.employees |
| DELETE | `/api/employees/:id` | manage.employees |
| POST | `/api/employees/:id/unmask` | unmask.sensitive |
| GET | `/api/employees/import-csv/template` | manage.employees |
| POST | `/api/employees/import-csv` | manage.employees |
| GET | `/api/employee-change-requests` | Auth (+ compliant filter) |
| POST | `/api/employee-change-requests` | write.employee_change |
| POST | `/api/employee-change-requests/:id/decide` | approve.employee_change |

---

## Masking Rules (`employee.service`)

Sensitive fields returned masked by default: PAN/bank/PF/ESI/IFSC/account name use tail-4 masking; Aadhaar `XXXX XXXX 1234`. `isMasked: true` on all list/detail responses until explicit unmask.
