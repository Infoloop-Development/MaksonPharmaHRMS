# Edge Cases, Retries & Operational Limits

Source: `app.ts`, route-level rate limiters, `auth.service.ts`, `reportJob.service.ts`, `attendanceIngestion.service.ts`, `middleware/error.ts`, `goLive.service.ts`.

---

## Rate Limiters

All use `express-rate-limit` with `standardHeaders: true` (RateLimit-* headers).

| Surface | Window | Max | Key | Notes |
|---------|--------|-----|-----|-------|
| `POST /api/auth/login` | 1 min | 10 | IP (`req.ip` or socket; strips `::ffff:`) | Custom keyGenerator avoids proxy undefined IP 500 |
| `POST /api/activity/log` | 1 min | 40 | `activity:{userId}` | Per authenticated user |
| `GET /api/public/visitor-forms/:slug` | 1 min | 30 | IP | Public form load |
| `POST …/:slug/submit` | 1 min | 10 | IP | Form submission |
| `POST …/:slug/upload` | 1 min | 5 | IP | File upload |
| `/iclock/*` | 1 min | 600 | IP | Biometric push |
| `/integrations/hanvon/push` | 1 min | 300 | IP | Hanvon push |

**Exceeded:** HTTP 429 with rate limit headers; login returns standard express-rate-limit response.

**Trust proxy:** `app.set('trust proxy', 1)` for correct IP behind Render.

---

## Idempotency

### Biometric punches (`AttendanceRaw`)

| Mechanism | Detail |
|-----------|--------|
| Key format | SHA256(`vendor\|serial\|biometricId\|timestampIst\|punchType`).slice(0,40) |
| Index | Unique sparse on `idempotencyKey` |
| Behavior | `ingestCanonicalPunches` pre-fetches existing keys; duplicates skipped silently |
| Retry safe | Device replaying same punch does not double-count |

### Regularization synthetic punches

| Key | Example |
|-----|---------|
| Missed in | `reg:{requestId}:in` |
| Missed out | `reg:{requestId}:out` |

Approval checks existing key before insert — re-approve safe.

### Report jobs

No idempotency key — each `POST /report-jobs` creates new `queued` document. Client should poll single `jobId`.

---

## JWT & Session Edge Cases

### Access token

| Case | Behavior |
|------|----------|
| Expired access | Client calls `POST /api/auth/refresh` |
| Invalid signature | 401 on protected routes |
| Permissions changed server-side | Visible after refresh or re-login (JWT carries snapshot) |
| `unmaskEnabled` toggled off | `unmask.sensitive` stripped on next token issue |

### Refresh token rotation

| Case | Behavior |
|------|----------|
| Valid refresh | Old token revoked; new pair issued (`rotatedFromTokenHash` chain) |
| Reused refresh (revoked) | 401 `invalid_refresh_token` |
| Expired refresh | 401; TTL index eventually deletes row |
| User deactivated mid-refresh | 401 `User no longer active` |
| Password changed | **All** refresh tokens revoked — all devices logged out |
| Admin revoke sessions | Same as password change for that user |
| Logout | Single refresh token revoked |

### Account lockout

| Parameter | Value |
|-----------|-------|
| Threshold | 5 failed password attempts |
| Duration | 15 minutes (`lockedUntil`) |
| HTTP status | 423 `account_locked` |
| Success login | Resets `failedLoginCount`, clears `lockedUntil` |

### mustChangePassword

| Case | Behavior |
|------|----------|
| Flag true | `App.tsx` `RequireAuth` redirects all routes → `/change-password` |
| Exception | `/change-password` uses `RequireAuthSession` (no redirect loop) |
| New user default | `mustChangePassword: true` on `POST /users` |
| After change | Flag cleared; all refresh tokens revoked |
| Admin force reset | `PATCH /users/:id` sets flag; revokes sessions if changed |

---

## Report Job Limits & Failures

| Limit | Value | Error |
|-------|-------|-------|
| Max employees (enqueue) | 3000 | 503 `report_too_large` |
| Build timeout | 90s (`REPORT_BUILD_MAX_MS`) | Job `failed` with timeout message |
| Large staff heuristic | >500 employees + timeout | `REPORT_GENERATION_FAILED_MESSAGE` |
| Job TTL | 24h after complete/fail | Purged by runner |
| Poll interval | 3s | Client should backoff |
| Concurrency | 1 job globally per server instance | Second job waits in `queued` |
| Download before ready | — | 409 `not_ready` |
| Wrong user download | — | 403 unless `org.admin` |

**Deprecated sync endpoints:** `POST /compliance-attendance/report.xlsx` returns **410** with message to use report jobs.

**Retry guidance:** User message suggests off-peak retry; no automatic retry queue.

---

## Attendance Ingestion Edge Cases

| Case | Behavior |
|------|----------|
| Unknown biometric ID | Punch rejected / logged (no employee match) |
| Unknown device serial | eSSL/Hanvon request rejected |
| Inactive device | Not found in whitelist |
| Duplicate idempotency key | Skip insert |
| Raw update/delete attempt | Mongoose pre-hook throws — append-only enforced |
| Late punch after day computed | Triggers `AttendanceDerived` recompute |

---

## API Error Conventions

**Shape:** `{ error: code, message: string }` via `ApiError` middleware.

| Code | Typical HTTP | Scenario |
|------|--------------|----------|
| `invalid_credentials` | 401 | Login/password |
| `account_locked` | 423 | Lockout |
| `invalid_refresh_token` | 401 | Refresh rotation failure |
| `forbidden` | 403 | RBAC |
| `feature_disabled` | 403 | Unmask when flag off |
| `not_found` | 404 | Missing entity |
| `not_ready` | 409 | Report job incomplete |
| `report_too_large` | 503 | Too many employees |
| `validation_error` | 400 | Zod parse failure |
| `payload_too_large` | 400 | Activity log >4KB |
| `rate_limit` | 429 | Hanvon limiter message object |

---

## Activity Log Limits

| Limit | Value |
|-------|-------|
| UI payload max | 4096 bytes JSON (`assertUiPayloadSize`) |
| POST rate | 40/min/user |
| Hidden events (self) | `login_failed`, `welcome_email_failed`, unmask when disabled |
| Failed CSV imports | Hidden from self-service (`successCount: 0`) |

---

## Public Visitor Edge Cases

| Case | Behavior |
|------|----------|
| Archived/inactive form | 404 on GET |
| Retired slug | Lookup checks `retiredSlugs` |
| File too large | Multer 5MB limit |
| Submit without required fields | Zod + `validateVisitorResponses` 400 |
| Intro video attestation | `validateIntroAttestation` when intro requires video |

---

## Go-Live Readiness (`/api/go-live`)

| Endpoint | Purpose |
|----------|---------|
| `GET /orphan-punches` | Raw punches with no matching active employee |
| `GET /readiness` | Pre-launch checklist aggregates |

Used for migration validation — not part of daily HR workflows.

---

## Permission Backfill Edge Case

When new permissions added to `PERMISSIONS_BY_ROLE` in code:

1. Startup scans all active users
2. Login/refresh/me runs per-user `ensureUserRoleDefaultPermissions`
3. Custom permission subsets preserved; only **missing defaults** added

---

## Feature Flag Edge Cases

| Case | Behavior |
|------|----------|
| Mongo null for runtime flag | Falls back to env default |
| Admin disables unmask | Existing JWT may still list permission until refresh; API blocks anyway |
| Web flag out of sync | Admin console `webSynced` warning in summary (when enriched client-side) |
| `COMPLIANCE_AUTOGEN_ENABLED=false` | Scheduler logs `compliance_scheduler_disabled`; HTTP autogen still works with auth |

---

## Production Warnings

| Condition | Log |
|-----------|-----|
| `NODE_ENV=production` + CORS localhost | Warn to set Netlify URL |
| `notifyOrgAdmins` failure | Warn only — parent action succeeds |
| `welcome_email_failed` | Audit + warn; user still created |
| Compliance scheduler error | `compliance_scheduler_failed` — next day retries via cron |

---

## Client Retry Patterns (recommended)

| Operation | Retry? |
|-----------|--------|
| Login | No — lockout risk |
| Refresh token | Once — if fails, redirect login |
| Report job poll | Yes — exponential backoff until `completed`/`failed` |
| Biometric ingest | Device firmware handles — server idempotent |
| Settings save | User-initiated retry on 4xx/5xx |

---

## Cross-References

- Auth workflows: [03-auth-session-onboarding.md](./03-auth-session-onboarding.md)
- Report jobs: [15-background-jobs.md](./15-background-jobs.md)
- Integrations rate limits: [17-integrations.md](./17-integrations.md)
- Data immutability: [14-data-lifecycles.md](./14-data-lifecycles.md)
