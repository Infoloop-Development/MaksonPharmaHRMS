# Attendance Workflows

Source: `mams-server/src/routes/attendance.routes.ts`, `attendanceIngestion.service.ts`, `attendance.service.ts`, `attendanceRawList.service.ts`, `attendanceRawStats.service.ts`, `essl.routes.ts`, `hanvon.routes.ts`, `shared/types/src/attendance.ts`, `punchEvent.ts`.

Device push ingestion is covered in `10-devices-biometrics-workflows.md`; this document focuses on **reading** attendance and the derived computation pipeline.

---

## Collections

| Collection | Purpose |
|------------|---------|
| `attendance_raw` | Append-only punch events (device, regularization, adjustments) |
| `attendance_derived` | One row per employee per IST date — real + compliant projections |
| `employees` | Shift, weekly off, biometric mapping |
| `devices` | Source device reference on raw punches |
| `audit_logs` | `orphan_punch` when biometricId unknown |

---

## Zod Schemas

### Derived attendance list (`attendance.routes.ts` — local `QuerySchema`)

| Field | Rules |
|-------|-------|
| `date` | optional `YYYY-MM-DD` |
| `startDate`, `endDate` | optional range on `date` |
| `employeeId`, `department`, `location` | optional filters |
| `page` | int ≥ 1, default 1 |
| `pageSize` | 1–500, default 100 |

### Raw punch list (`AttendanceRawListQuerySchema`)

| Field | Rules |
|-------|-------|
| `search`, `date`, `startDate`, `endDate` | optional |
| `punchType` | `IN` \| `OUT` \| `OTHER` |
| `outsideShiftOnly` | boolean |
| `page`, `pageSize` | pageSize max 200 |
| `sortBy` | `rawTimestamp`, `name`, `empCode`, `punchType` |
| `limit` | 1–200 (live feed shortcut) |

### Raw stats (`AttendanceRawStatsQuerySchema`)

`search`, `date`, `startDate`, `endDate` — no `punchType` (full breakdown in tiles).

### Canonical punch (`CanonicalPunchEventSchema`)

Produced by vendor adapters before ingestion:

- `biometricId`, `timestampIst` (`YYYY-MM-DD HH:mm:ss` IST wall clock)
- `punchType`: `IN` \| `OUT` \| `OTHER`
- `vendor`, `rawProtocol`, `parserVersion`, `vendorPayload`
- `idempotencyKey` — dedupe key

---

## Data Projection by viewMode

JWT `viewMode` controls derived attendance API fields (not a permission check on route — any auth user):

| viewMode | Fields returned |
|----------|-----------------|
| `real` | `realEntryAt`, `realExitAt`, `realGrossHours`, `realNetHours`, `breakMinutes`, `otHours`, `dayType`, `status` |
| `compliant` | `compliantEntryAt`, `compliantExitAt`, `compliantHours`, `dayType`, `status` |

`hr.admin` typically has `viewMode=real`; `hr.compliance` has `viewMode=compliant`.

---

## Derived Computation (`attendance.service` — `recomputeDerived`)

Triggered when:

- New raw punches ingested (`late_punch_arrived`)
- Regularization approved (`regularization_applied`)
- Adjustment approved (separate module)

**Rules:**

1. Load all `attendance_raw` for `(employeeId, rawDate)` sorted by `rawTimestamp`.
2. **No punches:** If employee `weeklyOff` includes that weekday → `dayType=Weekly Off`, `status=Weekly Off`; else `Absent`.
3. **With punches:** `realEntryAt` = first punch; `realExitAt` = last punch; `decomposeHours` for gross/net/break/OT.
4. **Compliant projection:** `smartAnchorV2()` using employee `alternateShift` (A/B/C) produces compliant entry/exit and 8h-style `compliantHours`.
5. Upsert single `attendance_derived` row per day.

**Enums:**

- `DayType`: `Working`, `Weekly Off`, `Absent`
- `AttendanceStatus`: `Present`, `Absent`, `Weekly Off`, `Half Day`
- `PunchType`: `IN`, `OUT`, `OTHER`

---

## Ingestion Pipeline (`attendanceIngestion.service`)

All vendors call `ingestCanonicalPunches(device, events, sourceIp)`:

1. Map `biometricId` → `employeeId`; unknown bios → `orphans[]`, audit `orphan_punch`.
2. Convert IST timestamp → UTC `rawTimestamp`; set `rawDate` (IST calendar).
3. Dedupe by `idempotencyKey` before insert.
4. `insertMany` new rows; `recomputeDerived` for each affected `(employeeId, rawDate)` pair.
5. Update `devices.lastPingAt`.

Returns: `{ inserted, duplicates, orphans, affectedPairs }`.

---

## WORKFLOW: View Derived Attendance Grid

**ROLES:** Any authenticated user (projection varies by viewMode).

**PRECONDITIONS:** Bearer token.

### STEP 1 — Attendance / reports date view

- **UI:** Date or range filter, optional employee filter.
- **API:** `GET /api/attendance?date=&startDate=&endDate=&employeeId=&page=&pageSize=`
  - Response: `{ viewMode, items[], total, page, pageSize }` with populated `employeeId` (name, empCode, department, location)
- **DB:** Read `attendance_derived`; populate employee.
- **Errors:** 401; 400 Zod

**FINAL OUTCOME:** Paginated derived attendance for user's view mode.

---

## WORKFLOW: Attendance Log (Raw Punches)

**ROLES:** Any authenticated user.

### STEP 1 — Historical raw list

- **API:** `GET /api/attendance/raw?` + `AttendanceRawListQuerySchema` query params
  - Response: `AttendanceRawListResponse` (`items`, `total`, `page`, `pageSize`, optional `truncated`)

### STEP 2 — Live feed (polled ~5s)

- **API:** `GET /api/attendance/raw/recent?limit=50` (max 200)
  - Response: `{ items }` — latest punches only

- **DB:** Read `attendance_raw` with search/join on employees; IST date filtering.
- **Business rules:** `outsideShiftOnly` flags punches outside configured shift windows (service-level).

**FINAL OUTCOME:** Operational visibility into device-level punches.

---

## WORKFLOW: Raw Punch KPI Stats

**ROLES:** Any authenticated user.

### STEP 1 — Stats tiles on Attendance Log

- **API:** `GET /api/attendance/raw/stats?date=&startDate=&endDate=&search=`
  - Response: `AttendanceRawStats` — `{ total, in, out, other, uniqueEmployees, scope, scopeDate? }`
  - `scope`: `today` \| `date` \| `range` \| `all`

**FINAL OUTCOME:** Aggregate punch counts for dashboard tiles.

---

## WORKFLOW: Device → Raw → Derived (End-to-End)

**ROLES:** System (devices); HR views result.

**PRECONDITIONS:** Employee `biometricId` matches device user id; device registered and active.

### STEP 1 — Device pushes punches

- eSSL: `POST /iclock/cdata?SN=&table=ATTLOG` (see doc 10)
- Hanvon: `POST /integrations/hanvon/push` (see doc 10)

### STEP 2 — Ingestion

- Adapter → `CanonicalPunchEvent[]` → `ingestCanonicalPunches`
- **DB:** Insert `attendance_raw`; recompute `attendance_derived`

### STEP 3 — HR views derived row

- Same as derived grid workflow; real vs compliant fields per JWT viewMode.

**Errors (ingestion):** Orphan punches logged, not inserted; duplicates silently skipped.

**FINAL OUTCOME:** Same-day attendance row updated within seconds of punch arrival.

---

## API Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/attendance` | Bearer | Derived attendance list |
| GET | `/api/attendance/raw` | Bearer | Raw punch list |
| GET | `/api/attendance/raw/recent` | Bearer | Live punch feed |
| GET | `/api/attendance/raw/stats` | Bearer | Raw punch KPIs |

**Device endpoints (not under `/api`):**

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/iclock/cdata` | eSSL handshake + ATTLOG push |
| GET | `/iclock/getrequest` | eSSL poll command |
| POST | `/integrations/hanvon/push` | Hanvon JSON batch |

---

## IST Convention

All calendar dates in attendance (`rawDate`, derived `date`, query params) use **Asia/Kolkata** IST unless noted. Raw `rawTimestamp` stored UTC; displayed converted to IST in UI/services.

---

## Related Workflows

- **Adjustments** — manual compliant/real corrections (separate module)
- **Regularization** — synthetic raw punches on approval (doc 08)
- **Compliance autogen** — separate synthetic compliant ledger (doc 06), not mixed into `attendance_derived` real punches
