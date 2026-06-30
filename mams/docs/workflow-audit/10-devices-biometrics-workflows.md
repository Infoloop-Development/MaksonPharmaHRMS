# Devices & Biometrics Workflows

Source: `mams-server/src/routes/devices.routes.ts`, `essl.routes.ts`, `hanvon.routes.ts`, `deviceSync.service.ts`, `attendanceIngestion.service.ts`, `shared/types/src/device.ts`, `punchEvent.ts`, `attendance.ts` (ESSLPunch).

Biometric attendance flows: **register device** → **device pushes/pulls punches** → **canonical ingestion** → **derived attendance recompute**.

---

## Collections

| Collection | Purpose |
|------------|---------|
| `devices` | Registry: serial, vendor, protocol, integration config, ping/sync metadata |
| `attendance_raw` | Ingested punches (append-only, idempotent) |
| `attendance_derived` | Recomputed per employee-day |
| `employees` | `biometricId` maps to device user id |
| `audit_logs` | device_registered/updated/deleted/synced; orphan_punch |

---

## Permissions (Admin API)

| Action | Permission |
|--------|------------|
| List devices | Auth (any user) |
| Create, update, delete, test, sync | `manage.devices` |

Device push endpoints (`/iclock`, `/integrations/hanvon`) use **device serial + config token**, not JWT.

---

## Zod Schemas

### Device CRUD (`devices.routes.ts`)

**`DeviceBaseSchema`:**

| Field | Rules |
|-------|-------|
| `deviceCode` | 1–50 chars |
| `serialNumber` | 1–100 chars (unique) |
| `vendor` | `eSSL` \| `Hanvon` (default eSSL) |
| `protocolMode` | `push` \| `pull` (default push) |
| `integrationConfig` | `DeviceIntegrationConfigSchema` optional |
| `model`, `name`, `department`, `location` | required strings |
| `ipAddress`, `notes` | optional |

**Hanvon refinements (`refineHanvonConfig`):**

- Pull mode → `integrationConfig.pullBaseUrl` required (valid URL)
- Push mode → `integrationConfig.pushToken` required (min 8 chars)

**`DeviceIntegrationConfigSchema`:**

- `pushToken` — Hanvon webhook secret
- `pullBaseUrl` — e.g. `http://192.168.0.50:8080`
- `apiKey` — Hanvon pull auth
- `pullIntervalMinutes` — 1–1440

### Canonical punch (`CanonicalPunchEventSchema`)

| Field | Description |
|-------|-------------|
| `biometricId` | Matches `employees.biometricId` |
| `timestampIst` | `YYYY-MM-DD HH:mm:ss` IST |
| `punchType` | IN \| OUT \| OTHER |
| `vendor` | eSSL \| Hanvon |
| `idempotencyKey` | Dedupe: vendor + deviceSn + bio + timestamp + type |
| `vendorPayload`, `rawProtocol`, `parserVersion` | Traceability |

### eSSL line format (`ESSLPunchSchema`)

Tab-separated ATTLOG line: `userId`, `timestamp`, `status` (0=in, 1=out, …), `verifyType`, `workCode`.

---

## Online / Health Semantics

- **isOnline:** `lastPingAt` within last **5 minutes** (list enrichment).
- **recentPunchCount:** Raw punches in last 24h per device.
- **totalEmployeesAssigned:** Count of active non-deleted employees (global, not per-device enrollment table).

---

## WORKFLOW: Register Device

**ROLES:** `it.admin`, `hr.admin` with `manage.devices`.

### STEP 1 — Add device form

- **UI:** Code, serial, vendor, protocol, model, name, dept, location, Hanvon integration fields.
- **API:** `POST /api/devices`
  - Body: `DeviceCreateSchema` (after `normalizeDeviceBody` strips null integration fields)
  - Response 201: device document
- **DB:** `devices.create` with `isActive: true`; audit `device_registered`; notify org admins.
- **Errors:**
  - 409 `duplicate_serial` — serial already exists
  - 400 Zod (Hanvon config missing)
  - 403 forbidden

**FINAL OUTCOME:** Device known to MAMS; eSSL/Hanvon can authenticate by serial.

---

## WORKFLOW: List & Monitor Devices

**ROLES:** Authenticated.

### STEP 1 — Device list

- **API:** `GET /api/devices`
  - Response: `{ items: enriched[], total }` with `isOnline`, `recentPunchCount`, `totalEmployeesAssigned`, defaults `vendor: eSSL`, `protocolMode: push`

**FINAL OUTCOME:** Operations dashboard for device health.

---

## WORKFLOW: Update / Remove Device

**ROLES:** `manage.devices`.

### STEP 1 — Patch

- **API:** `PATCH /api/devices/:id` — `DevicePatchSchema` partial

### STEP 2 — Delete

- **API:** `DELETE /api/devices/:id` → 204 hard delete

- **Errors:** 404 not found

**FINAL OUTCOME:** Registry updated; deleted serial returns 404 on push.

---

## WORKFLOW: Test Connectivity

**ROLES:** `manage.devices`.

### STEP 1 — Test button

- **API:** `POST /api/devices/:id/test`
  - Response: `DeviceSyncResult` — `{ ok, vendor, method, error? }`

**Branches:**

- **Hanvon pull:** GET `{pullBaseUrl}/api/health` with optional `X-Api-Key`, 10s timeout
- **Push devices (eSSL / Hanvon push):** `ok` if `lastPingAt` within 5 minutes

**FINAL OUTCOME:** Connectivity diagnostic without ingesting data.

---

## WORKFLOW: Manual Sync

**ROLES:** `manage.devices`.

### STEP 1 — Sync one device

- **API:** `POST /api/devices/:id/sync`
  - **Hanvon pull:** Calls `pullHanvonDeviceLogs` → ingests via `ingestCanonicalPunches`
  - **Push devices:** Updates `lastSyncAt`, `lastSyncStatus: ok` (ack only; punches arrive via push)
  - Response: `{ ok, inserted?, duplicates?, device }` or 502 on failure
- **Audit:** `device_synced`

### STEP 2 — Sync all active

- **API:** `POST /api/devices/sync-all`
  - Response: `{ ok, count, results[] }`

- **Errors:** 502 `sync_failed` with error message from adapter

**FINAL OUTCOME:** Pull devices fetch backlog; push devices refresh sync metadata.

---

## WORKFLOW: eSSL ADMS Push (Automatic)

**ROLES:** Physical device (no JWT).

**Mount:** `/iclock` (not under `/api`).

**PRECONDITIONS:** `DeviceModel` row with matching `serialNumber`, `vendor=eSSL`, `isActive=true`.

### STEP 1 — Handshake

- **API:** `GET /iclock/cdata?SN={serialNumber}`
  - Updates `lastPingAt`
  - Response: plain text handshake from `buildEsslHandshakeResponse`

### STEP 2 — Push attendance

- **API:** `POST /iclock/cdata?SN=&table=ATTLOG`
  - Body: plain text lines (tab-separated punches)
  - `esslAdapter.parsePunches` → `CanonicalPunchEvent[]`
  - `ingestCanonicalPunches(device, events, sourceIp)`
  - Response: `OK`
- **Other tables:** `OPERLOG` logged debug only

### STEP 3 — Device poll (optional)

- **API:** `GET /iclock/getrequest?SN=` — returns ATTLOG query command; updates ping

- **Rate limit:** 600 req/min per IP
- **Errors:** 404 plain text "Device not registered"

**FINAL OUTCOME:** Raw punches stored; derived attendance updated.

---

## WORKFLOW: Hanvon Push (Automatic)

**ROLES:** Hanvon device/SDK.

**Mount:** `/integrations/hanvon/push`

**PRECONDITIONS:** Device `vendor=Hanvon`, `isActive`, optional `pushToken` match.

### STEP 1 — Authenticated push

- **Headers:** `X-Device-Serial`, `X-Device-Token` (or `deviceSn` in body)
- **API:** `POST /integrations/hanvon/push`
  - Body: JSON batch (adapter-specific)
  - `hanvonAdapter.parsePunches` → canonical events
  - `ingestCanonicalPunches`
  - Response: `{ ok, inserted, duplicates, orphans }`
- **Errors:**
  - 400 `missing_serial`, `no_valid_records`
  - 401 `invalid_token`
  - 404 `device_not_registered`
- **Rate limit:** 300 req/min

**FINAL OUTCOME:** Same ingestion pipeline as eSSL.

---

## WORKFLOW: Hanvon Pull (Scheduled / Manual)

**ROLES:** System via sync endpoint.

**PRECONDITIONS:** `protocolMode=pull`, `integrationConfig.pullBaseUrl` (+ optional `apiKey`).

### STEP 1 — Pull logs

- Invoked by `POST /api/devices/:id/sync` or sync-all
- Fetches remote API, parses punches, calls `ingestCanonicalPunches`
- Updates device sync status fields

**FINAL OUTCOME:** Backfill when push unavailable.

---

## Ingestion Business Rules (`ingestCanonicalPunches`)

1. Resolve employees by `biometricId`; unmatched → `orphans` list + audit `orphan_punch` (not inserted).
2. Convert IST → UTC; set `rawDate` IST.
3. Skip rows with duplicate `idempotencyKey`.
4. `insertMany` new raw docs (`ordered: false`).
5. For each affected `(employeeId, rawDate)`: `recomputeDerived(..., 'late_punch_arrived')`.
6. Update `device.lastPingAt`.

**Returns:** `{ inserted, duplicates, orphans, affectedPairs }`

---

## WORKFLOW: Orphan Punch Handling

**ROLES:** System (automatic).

When device sends unknown `biometricId`:

- Punch **not** stored in `attendance_raw`
- `audit_logs` event `orphan_punch` with orphan id list
- Server logs warning `orphan_punches_received`

**HR remediation:** Create/update employee with matching `biometricId`, or fix device enrollment; historical orphans are not retried automatically.

**FINAL OUTCOME:** Data integrity preserved; ops alerted via audit.

---

## API Summary

### Admin (`/api/devices`)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/devices` | Auth |
| POST | `/api/devices` | manage.devices |
| PATCH | `/api/devices/:id` | manage.devices |
| DELETE | `/api/devices/:id` | manage.devices |
| POST | `/api/devices/:id/test` | manage.devices |
| POST | `/api/devices/:id/sync` | manage.devices |
| POST | `/api/devices/sync-all` | manage.devices |

### Device protocols (no JWT)

| Method | Path | Vendor |
|--------|------|--------|
| GET/POST | `/iclock/cdata` | eSSL |
| GET | `/iclock/getrequest` | eSSL |
| POST | `/iclock/devicecmd` | eSSL |
| POST | `/integrations/hanvon/push` | Hanvon |

---

## IST & Idempotency

- Device timestamps interpreted as **IST wall clock** (`timestampIst`).
- `rawDate` derived in IST for alignment with HR calendars.
- Re-sending same punch with same idempotency key counts as **duplicate** (not double-counted).

---

## Related Workflows

- **Attendance read paths** — doc 05
- **Regularization** — synthetic raw punches with `deviceId: null` (doc 08)
- **Employee biometricId** — must match device user id (doc 04)
