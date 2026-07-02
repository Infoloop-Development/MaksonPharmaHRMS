# Background Jobs & Scheduled Tasks

Source: `mams-server/src/index.ts`, `complianceScheduler.service.ts`, `reportJobRunner.service.ts`, `userPermissionBackfill.service.ts`, `featureFlags.service.ts`, `complianceAttendance.routes.ts`, `complianceAutogen.service.ts`.

All jobs run **in-process** on the API server (no separate worker dyno). Disabled via env flags where noted.

---

## Startup Sequence (`index.ts`)

```
1. connectDb()
2. loadFeatureFlagOverrides()     ← reads Settings.featureFlags into memory
3. backfillAllUsersRoleDefaultPermissions()
4. startComplianceScheduler()     ← no-op if COMPLIANCE_AUTOGEN_ENABLED=false
5. startReportJobRunner()         ← no-op if REPORT_JOBS_ENABLED=false
6. buildApp() + listen(PORT)
```

---

## 1. Feature Flag Load (startup)

**Service:** `loadFeatureFlagOverrides()` in `featureFlags.service.ts`

| Property | Value |
|----------|-------|
| Schedule | Once at boot (before HTTP listen) |
| Trigger | Server start |
| Reads | `settings.featureFlags` (`unmaskEnabled`, `autogenDemoEnabled`) |
| Writes | In-memory cache via `setCachedFeatureFlagOverrides`; mirrors to `process.env.FEATURE_*` |
| Failure | Throws if DB unreachable (startup abort) |

**Runtime refresh:** Admin `PATCH /api/admin/feature-flags` updates cache immediately without restart.

---

## 2. Role Permission Backfill (startup)

**Service:** `backfillAllUsersRoleDefaultPermissions()` in `userPermissionBackfill.service.ts`

| Property | Value |
|----------|-------|
| Schedule | Once at boot |
| Scope | All users where `isActive !== false` |
| Logic | `ensureUserRoleDefaultPermissions` — adds missing defaults from `PERMISSIONS_BY_ROLE` without removing custom grants |
| Writes | `users.permissions` when new permissions introduced in code |
| Logging | `Role permission backfill complete { updatedUsers: N }` |

**Also runs:** On every login, refresh, and `/api/auth/me` (per-user, not full scan).

---

## 3. Compliance Autogen Scheduler (cron)

**Service:** `startComplianceScheduler()` in `complianceScheduler.service.ts`

| Property | Value |
|----------|-------|
| Enabled when | `COMPLIANCE_AUTOGEN_ENABLED=true` (env) |
| Schedule | `0 0 * * *` — midnight IST daily (`node-cron`, timezone `Asia/Kolkata`) |
| Target date | **Yesterday** IST (`yesterdayIstDateString()`) |
| Worker | `runComplianceAutogenForDate(targetDate)` |
| Skip rule | Sundays skipped (`isSundayIstDate`) |
| Error handling | Logged; does not crash server |

### Autogen algorithm (`complianceAutogen.service.ts`)

1. Load active, non-deleted employees
2. Sort by `alternateShift` (A→B→C) then name
3. For each employee: `generateDailyCompliancePunches` (deterministic seed from `employeeId:date`)
4. Upsert `ComplianceGeneratedAttendance` (`bulkWrite` updateOne upsert)
5. Return `{ date, skippedSunday, generated, errors }`

**Collection written:** `compliancegeneratedattendances`  
**Does not touch:** `AttendanceRaw`, `AttendanceDerived`

---

## 4. HTTP-Triggered Compliance Autogen

**Routes:** `POST /api/compliance-attendance/generate`, `POST /api/compliance-attendance/generate-month`

| Auth path | Who can trigger |
|-----------|-----------------|
| JWT + `org.admin` | Yes |
| JWT + `read.compliant` permission | Yes |
| Header `x-cron-secret` matching `COMPLIANCE_AUTOGEN_CRON_SECRET` | Yes (external cron / Render cron job) |

### Single day generate

- **Query:** `date=YYYY-MM-DD` (optional; default yesterday IST)
- **Calls:** `runComplianceAutogenForDate(date)`

### Month generate

- **Query:** `yearMonth=YYYY-MM` (required)
- **Calls:** `runComplianceAutogenForMonth(yearMonth)` — iterates each day

**Use case:** Manual backfill, Render HTTP cron hitting API with secret header when in-process scheduler disabled.

---

## 5. Report Job Runner (poller)

**Service:** `startReportJobRunner()` in `reportJobRunner.service.ts`

| Property | Value |
|----------|-------|
| Enabled when | `REPORT_JOBS_ENABLED !== false` (default **true**) |
| Poll interval | 3000 ms |
| Concurrency | Single-flight (`running` mutex — one job at a time) |
| Initial tick | Immediate on start |

### Poll cycle (`tick()`)

```
1. Every 120 polls (~6 min): purgeExpiredReportJobs() — delete where expiresAt <= now
2. claimNextReportJob() — atomic findOneAndUpdate queued → running (FIFO by createdAt)
3. runReportJob(job) — build XLSX, store in MongoDB
4. On error: log, mark job failed
```

### Job types (`reportJob.service.ts`)

| Type | Builder | Access |
|------|---------|--------|
| `compliance_monthly` | `buildComplianceMonthlyReportXlsx` | `read.compliant` |
| `financial` | `buildFinancialReportXlsx` | `org.admin` only at enqueue |

**Limits:**
- Enqueue rejects >3000 employees (`report_too_large`, HTTP 503)
- Build timeout: 90s (`REPORT_BUILD_MAX_MS`)
- Progress: `processedCount` updated every 50 employees
- TTL: 24h after complete/fail (`expiresAt`)

**Storage:** XLSX binary in `reportjobs.fileData` (MongoDB, not object storage).

---

## 6. Refresh Token TTL (MongoDB index)

**Model:** `RefreshToken` — index `{ expiresAt: 1 }` with `expireAfterSeconds: 0`

| Property | Value |
|----------|-------|
| Mechanism | MongoDB TTL collection scan (not application cron) |
| Effect | Deletes expired refresh token documents automatically |

---

## 7. Seed / Manual Backfill Scripts (not production cron)

| Script | Purpose |
|--------|---------|
| `seed/seedAttendanceDays.ts` | Dev seed: backfill attendance for date range |
| `seed/seed.ts` | Full demo seed |
| `npm run seed` | Manual operator invocation |

These are **not** started by `index.ts`; documented for operator awareness.

---

## Environment Flags Summary

| Env var | Default (dev) | Production (`render.yaml`) | Effect |
|---------|---------------|---------------------------|--------|
| `COMPLIANCE_AUTOGEN_ENABLED` | false | **false** | In-process midnight cron |
| `COMPLIANCE_AUTOGEN_CRON_SECRET` | unset | set in dashboard | HTTP autogen auth |
| `REPORT_JOBS_ENABLED` | true | **true** | Report poller |
| `FEATURE_UNMASK_ENABLED` | true | true | Boot default before Mongo override |

---

## Operational Notes

1. **Single instance assumption:** Report runner and compliance cron assume one API instance; multiple instances would compete on `claimNextReportJob` (safe) but run duplicate cron (use HTTP cron + disable in-process scheduler in multi-instance).
2. **Render deploy:** `render.yaml` sets `COMPLIANCE_AUTOGEN_ENABLED=false`; operators enable via dashboard or use external HTTP cron with secret.
3. **No queue broker:** Report jobs are MongoDB documents, not Redis/SQS.
4. **Graceful disable:** `stopReportJobRunner()` exists for tests; not called on SIGTERM in production.

---

## Cross-References

- Report job user workflow: [06-compliance-workflows.md](./06-compliance-workflows.md)
- ReportJob model lifecycle: [14-data-lifecycles.md](./14-data-lifecycles.md)
- Env reference: [18-feature-flags-env.md](./18-feature-flags-env.md)
