# Regularization Workflows

Source: `mams-server/src/routes/regularization.routes.ts`, `regularizationApply.service.ts`, `shared/types/src/regularization.ts`.

Regularization corrects missing or wrong attendance punches by creating **synthetic raw punches** on approval, then recomputing derived attendance.

---

## Collections

| Collection | Purpose |
|------------|---------|
| `regularization_requests` | Pending/Approved/Rejected requests |
| `attendance_raw` | Synthetic punches inserted on approval (`source: regularization`) |
| `attendance_derived` | Recomputed after approval |
| `employees` | Validation + biometricId on synthetic punches |
| `audit_logs` | `regularization_created`, `regularization_approved`, `regularization_rejected` |

---

## Permissions

| Action | Permission |
|--------|------------|
| List, preview | Auth (any logged-in user) |
| Create request | `write.regularization` |
| Approve / reject | `approve.regularization` |

Default: `hr.admin` has write + approve; `hr.compliance` has approve only (not write by default).

---

## Zod Schemas

### `RegularizationCreateSchema`

| Field | Rules |
|-------|-------|
| `employeeId` | string min 1 |
| `date` | `YYYY-MM-DD` |
| `type` | `missed_in` \| `missed_out` \| `missed_both` \| `wrong_punch` \| `other` |
| `requestedInTime` | `HH:mm` 24h — required for missed_in, missed_both, wrong_punch |
| `requestedOutTime` | `HH:mm` — required for missed_out, missed_both, wrong_punch |
| `reason` | 10–2000 chars |
| `remarks` | optional max 500 |

Helpers: `regularizationTypeNeedsIn(type)`, `regularizationTypeNeedsOut(type)`.

### `RegularizationApproveSchema`

`approverNote?` max 2000

### `RegularizationRejectSchema`

`approverNote` required min 1 max 2000

### `RegularizationListQuerySchema`

`status`, `employeeId`, `startDate`, `endDate`, `page`, `pageSize` (max 200)

### `RegularizationPreviewQuerySchema`

`employeeId`, `date` (YYYY-MM-DD)

### Status

`Pending` | `Approved` | `Rejected`

---

## Business Rules

### Duplicate prevention (`assertNoDuplicatePending`)

Only **one Pending** request per `(employeeId, date)` — 409 `duplicate_pending`.

### Approval application (`applyRegularizationApproval`)

1. Build punch specs from type + requested times:
   - IN punch: `istStringToUtc(date + requestedInTime:00)`
   - OUT punch: same for out time
   - Idempotency keys: `reg:{requestId}:in`, `reg:{requestId}:out`
2. Insert `attendance_raw` rows with `deviceId: null`, `vendor: 'eSSL'`, payload `{ source: 'regularization', regularizationRequestId }`.
3. Duplicate key → reuse existing raw id (idempotent re-approve safe).
4. `recomputeDerived(employeeId, date, 'regularization_applied')`.
5. Store `appliedRawIds` on request document.

### Preview

Shows employee, derived summary (real entry/exit IST HH:mm, status, dayType), raw punch count and list with formatted times.

---

## WORKFLOW: Preview Before Request

**ROLES:** Any authenticated user.

### STEP 1 — Select employee + date

- **API:** `GET /api/regularization/preview?employeeId=&date=`
  - Response:
    ```json
    {
      "employee": { "id", "name", "empCode" },
      "date": "YYYY-MM-DD",
      "derived": { "status", "realEntryAt", "realExitAt", "dayType" } | null,
      "rawPunchCount": number,
      "rawPunches": [{ "punchType", "time", "source" }]
    }
    ```
- **Errors:** 400 `invalid_employee`; 404 employee not found

**FINAL OUTCOME:** HR sees existing punches before filing regularization.

---

## WORKFLOW: Submit Regularization Request

**ROLES:** `write.regularization`.

### STEP 1 — Regularization form

- **UI:** Employee, date, type (drives required IN/OUT times), reason, optional remarks.
- **API:** `POST /api/regularization`
  - Body: `RegularizationCreateSchema`
  - Response 201: created request (`status: Pending`)
- **DB:** `regularization_requests.create`; audit `regularization_created`.
- **Errors:**
  - 400 Zod (missing IN/OUT for type)
  - 404 employee not found
  - 409 `duplicate_pending`

**FINAL OUTCOME:** Request queued for approver.

---

## WORKFLOW: List Regularization Queue

**ROLES:** Authenticated.

### STEP 1 — Filterable list

- **API:** `GET /api/regularization?status=&employeeId=&startDate=&endDate=&page=`
  - Response: `{ items, total, page, pageSize, counts: { Pending, Approved, Rejected } }`
- **DB:** Populate employee, initiatedBy, decidedBy; sorted by `initiatedAt` desc.

**FINAL OUTCOME:** Approval queue with status counts.

---

## WORKFLOW: Approve Regularization

**ROLES:** `approve.regularization`.

**PRECONDITIONS:** Request status `Pending`.

### STEP 1 — Approve

- **UI:** Optional approver note.
- **API:** `PATCH /api/regularization/:id/approve`
  - Body: `RegularizationApproveSchema`
  - Response: updated request with `appliedRawIds`
- **DB:** Insert raw punch(es); recompute derived; set status Approved, decidedBy/At/Ip.
- **Business rules:** At least one punch spec required for type; employee must exist.
- **Errors:**
  - 404 pending request not found
  - 400 `invalid_request` — no punch times to apply

**FINAL OUTCOME:** Synthetic punches in raw log; derived attendance updated for that IST date.

---

## WORKFLOW: Reject Regularization

**ROLES:** `approve.regularization`.

### STEP 1 — Reject with note

- **API:** `PATCH /api/regularization/:id/reject`
  - Body: `RegularizationRejectSchema` — note required
- **DB:** status Rejected; no punch insertion; audit `regularization_rejected`.

**FINAL OUTCOME:** Request closed; attendance unchanged.

---

## Type → Required Times Matrix

| type | requestedInTime | requestedOutTime |
|------|-----------------|------------------|
| missed_in | required | — |
| missed_out | — | required |
| missed_both | required | required |
| wrong_punch | required | required |
| other | — | — (approval may fail if no times) |

For `other`, create schema allows omitting times, but approval throws `invalid_request` if no specs generated.

---

## API Summary

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/regularization` | Auth |
| GET | `/api/regularization/preview` | Auth |
| POST | `/api/regularization` | write.regularization |
| PATCH | `/api/regularization/:id/approve` | approve.regularization |
| PATCH | `/api/regularization/:id/reject` | approve.regularization |

---

## IST Convention

`date` and preview times are **IST calendar**; stored `rawTimestamp` is UTC converted via `istStringToUtc`. Display uses `utcToIstTimeString` (HH:mm).

---

## Related Workflows

- **Attendance derived recompute** — doc 05 (`recomputeDerived`)
- **Adjustments** — separate compliant/real adjustment module (not regularization)
- **Compliance autogen** — independent ledger; does not consume regularization punches directly
