# Integrations

Source: `mams-server/src/integrations/`, `mams-server/src/routes/essl.routes.ts`, `mams-server/src/routes/hanvon.routes.ts`, `mams-server/src/routes/publicVisitor.routes.ts`, `mams-server/src/services/visitor/`, `render.yaml`, `mams-web` Netlify deployment.

**N/A in MAMS:** Payment gateways, external object storage (S3), SMS providers, OAuth social login.

---

## Integration Map

| System | Protocol | Mount path | Auth |
|--------|----------|------------|------|
| MongoDB | Wire protocol | `MONGO_URI` | Connection string |
| eSSL ADMS | HTTP text (`/iclock`) | `/iclock/*` | Serial whitelist (active device) |
| Hanvon SDK | JSON POST | `/integrations/hanvon/push` | `X-Device-Serial` + `X-Device-Token` |
| SMTP | Nodemailer | Outbound | `SMTP_*` env |
| Google Translate | HTTP API | Visitor translate service | API key env (if configured) |
| Render | PaaS | API hosting | Blueprint `render.yaml` |
| Netlify | Static CDN | Web app | Build-time `VITE_*` env |

---

## MongoDB

| Property | Value |
|----------|-------|
| Driver | Mongoose 8 |
| Default dev URI | `mongodb://localhost:27017/mams_dev` |
| Production | `MONGO_URI` secret on Render |
| Binary storage | `VisitorFile.data`, `ReportJob.fileData` stored as BSON Buffer |
| TTL indexes | `refreshtokens.expiresAt`, manual purge for `reportjobs` |

**Health check:** `GET /api/admin/health` reports `dbConnected`, `dbState` (1 = connected).

---

## eSSL Biometric (ADMS Push)

**Files:** `integrations/adapters/essl/adapter.ts`, `routes/essl.routes.ts`

### Protocol surface

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/iclock/cdata` | Device handshake / config |
| POST | `/iclock/cdata` | Attendance log push |
| GET | `/iclock/getrequest` | Poll commands |

**Mount:** Root `/iclock` (not under `/api`) — matches device firmware expectations.

### Authentication

- No JWT. Device identified by **serial number** in request.
- `findEsslDevice(serialNumber)` — must exist, `isActive=true`, `vendor='eSSL'`.
- Unknown serial → request ignored / error response.

### Ingestion pipeline

```
eSSL POST → esslAdapter.parse → canonical punch[]
         → ingestCanonicalPunches()
         → buildIdempotencyKey(vendor, serial, biometricId, timestamp, punchType)
         → AttendanceRaw insert (skip duplicates)
         → recompute AttendanceDerived for affected dates
```

### Rate limiting

- `iclockLimiter`: 600 requests/minute per IP

### Device fields used

`serialNumber`, `vendor`, `protocolMode`, `integrationConfig.pushToken`, `lastPingAt`

---

## Hanvon Biometric (SDK Push)

**Files:** `integrations/adapters/hanvon/adapter.ts`, `routes/hanvon.routes.ts`

### Endpoint

`POST /integrations/hanvon/push` — JSON body with attendance records.

### Authentication

Headers:
- `X-Device-Serial` (or `body.deviceSn`)
- `X-Device-Token` — must match `device.integrationConfig.pushToken`

### Ingestion

Same `ingestCanonicalPunches` path as eSSL with `vendor: 'Hanvon'`.

### Rate limiting

- `hanvonLimiter`: 300 requests/minute per IP

### Sync status

On success/failure updates `devices.lastSyncAt`, `lastSyncStatus`, `lastSyncError`.

---

## Idempotency (biometric)

**File:** `integrations/idempotency.ts`

```typescript
buildIdempotencyKey({ vendor, deviceSerial, biometricId, timestampIst, punchType })
→ SHA256 truncated to 40 hex chars
```

**Index:** `attendanceraws.idempotencyKey` unique sparse — duplicate punches silently skipped in `attendanceIngestion.service`.

**Regularization** uses deterministic keys: `reg:{requestId}:in|out`.

---

## SMTP Email

**Files:** `config/mail.ts`, `services/mail.service.ts`

| Use case | Function |
|----------|----------|
| New user welcome | `sendWelcomeUserEmail` |

See [16-notifications-alerts.md](./16-notifications-alerts.md) for env matrix.

---

## Visitor Public Forms

**Routes:** `/api/public/visitor-forms/:slug/*` (no auth)

| Endpoint | Purpose |
|----------|---------|
| GET `/:slug` | Load form definition (active, non-archived) |
| POST `/:slug/upload` | File upload → `VisitorFile` |
| POST `/:slug/submit` | Create `VisitorRequest` |

### Rate limits (per IP)

| Limiter | Max/min |
|---------|---------|
| GET form | 30 |
| Submit | 10 |
| Upload | 5 |

### Multilingual / translation

**Services:** `visitor/visitorTranslate.service.ts`, `visitor/visitorForm.service.ts`

- Form supports `multilingual.enabled`, locale variants (`gu`, `hi`)
- Translation may call external translate API when configured
- Intro media: `visitorIntroMedia.service.ts` — image/video upload or YouTube/Loom URLs

### File storage

Uploaded files stored in MongoDB (`visitorfiles`); max 5MB multer limit; field max 2MB default.

---

## Device Pull Sync (admin-initiated)

**Service:** `deviceSync.service.ts`

| Action | API |
|--------|-----|
| Test connection | `POST /api/devices/:id/test` |
| Sync one device | `POST /api/devices/:id/sync` |
| Sync all | `POST /api/devices/sync-all` |

Pull-mode devices use `integrationConfig.pullBaseUrl`, `apiKey`, `pullIntervalMinutes`.

---

## Deployment Topology

### Render (API) — `render.yaml`

```yaml
rootDir: mams
buildCommand: npm install --include=dev && npm run build:server
startCommand: npm run start:server
runtime: node 20
```

**Secrets (dashboard):** `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, optional `COMPLIANCE_AUTOGEN_CRON_SECRET`, SMTP vars.

**Public URL:** API service URL (CORS allows Netlify origin).

### Netlify (Web)

- Build: `mams-web` with `VITE_*` feature flags baked at build time
- `PUBLIC_APP_URL` / `CORS_ORIGIN` must match Netlify URL in production

### Local dev

| Service | Port |
|---------|------|
| API | 3001 (`PORT`) |
| Vite | 5173 |
| MongoDB | 27017 |

CORS auto-includes `localhost:5173` in development.

---

## External HTTP Cron (optional)

When `COMPLIANCE_AUTOGEN_ENABLED=false` on Render, operators may schedule:

```
POST https://<api>/api/compliance-attendance/generate
Header: x-cron-secret: <COMPLIANCE_AUTOGEN_CRON_SECRET>
Authorization: Bearer <service-account-jwt>  (if required)
```

Or month variant with `?yearMonth=YYYY-MM`.

---

## Security Boundaries

| Surface | Trust model |
|---------|-------------|
| `/api/*` | JWT + RBAC permissions |
| `/iclock` | Device serial whitelist |
| `/integrations/hanvon` | Serial + push token |
| `/api/public/visitor-forms` | Rate limit + slug lookup |
| `/health` | Unauthenticated liveness |

`app.set('trust proxy', 1)` — correct client IP behind Render/Netlify proxy for rate limits.

---

## Cross-References

- Device admin workflows: [10-devices-biometrics-workflows.md](./10-devices-biometrics-workflows.md)
- Visitor workflows: [09-visitors-workflows.md](./09-visitors-workflows.md)
- Background autogen: [15-background-jobs.md](./15-background-jobs.md)
- Edge cases (rate limits): [19-edge-cases-retries.md](./19-edge-cases-retries.md)
