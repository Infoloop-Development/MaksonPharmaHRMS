# Feature Flags & Environment Configuration

Source: `shared/types/src/featureFlags.ts`, `mams-server/src/config/featureFlags.ts`, `mams-server/src/config/env.ts`, `mams-server/src/services/featureFlags.service.ts`, `mams-web/src/config/featureFlags.ts`, `render.yaml`.

---

## Resolution Order

### Runtime flags (`source: 'featureFlags'`)

```
1. MongoDB settings.featureFlags.{flag}  (if not null) → effectiveSource: 'mongo'
2. process.env FEATURE_* on server       → effectiveSource: 'env'
3. Default true
```

**Boot:** `loadFeatureFlagOverrides()` hydrates in-memory cache from Mongo before HTTP listen.

**Admin patch:** Updates Mongo + cache + `process.env` mirror immediately.

### Settings-backed flags (`source: 'settings'`)

```
settings.{smartAnchorEnabled|confidentialityNoticeEnabled}  → effectiveSource: 'settings'
```

Editable via Feature Flags console OR `PATCH /api/settings`.

### Web UI flags

```
import.meta.env VITE_FEATURE_*  (build-time only)
```

**No runtime sync** — `requiresWebRebuild: true` flags show deploy snippet in admin console.

---

## Feature Flag Catalog

| ID | Category | Risk | Server env | Web env | Settings field | requiresWebRebuild |
|----|----------|------|------------|---------|----------------|-------------------|
| `unmaskEnabled` | Security | high | `FEATURE_UNMASK_ENABLED` | `VITE_FEATURE_UNMASK_ENABLED` | — | yes |
| `autogenDemoEnabled` | Demo & Dev | low | `FEATURE_AUTOGEN_DEMO_ENABLED` | `VITE_FEATURE_AUTOGEN_DEMO_ENABLED` | — | yes |
| `smartAnchorEnabled` | HR Engine | medium | — | — | `smartAnchorEnabled` | no |
| `confidentialityNoticeEnabled` | Compliance | low | — | — | `confidentialityNoticeEnabled` | no |

### Behavioral impact

#### unmaskEnabled

| Layer | When disabled |
|-------|---------------|
| Server | `isUnmaskEnabled()` false; unmask API returns `feature_disabled` |
| Session | `filterPermissionsForSession` strips `unmask.sensitive` from JWT permissions |
| Web | `isUnmaskEnabled()` hides unmask UI, grants section |
| Activity | `unmask_succeeded`/`unmask_failed` hidden from activity lists |

#### autogenDemoEnabled

| Layer | When disabled |
|-------|---------------|
| Server | Route guards on autogen demo endpoints |
| Web | `/autogeneration-demo` route and nav hidden |

#### smartAnchorEnabled

| Layer | When disabled |
|-------|---------------|
| Attendance | Punch matching uses standard rules (no Smart Anchor v2) |
| Settings | `settings.smartAnchorVersion` still stored but engine respects flag |

#### confidentialityNoticeEnabled

| Layer | When disabled |
|-------|---------------|
| Exports | XLSX/PDF exports omit confidentiality footer |
| Text | `confidentialityNoticeText` ignored when disabled |

---

## Server Environment (`config/env.ts`)

Loaded from `mams-server/.env` (not cwd — supports monorepo root scripts).

| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `NODE_ENV` | enum | `development` | `development` \| `production` \| `test` |
| `PORT` | number | 3001 | HTTP listen port |
| `MONGO_URI` | string | `mongodb://localhost:27017/mams_dev` | Database |
| `JWT_ACCESS_SECRET` | string | min 16 | Access token signing |
| `JWT_REFRESH_SECRET` | string | min 16 | Refresh token signing |
| `JWT_ACCESS_EXPIRES` | string | `15m` | Access TTL |
| `JWT_REFRESH_EXPIRES` | string | `7d` | Refresh TTL (informational; hardcoded 7d in auth.service) |
| `CORS_ORIGIN` | string | `http://localhost:5173` | Comma-separated allowed origins |
| `PUBLIC_APP_URL` | string | `http://localhost:5173` | Welcome email links, CORS merge in prod |
| `LOG_LEVEL` | string | `info` | Pino/winston logger |
| `TZ` | string | `Asia/Kolkata` | Process timezone |
| `SMART_ANCHOR_VERSION` | string | `v2.0.0` | Stored on derived attendance |
| `COMPLIANCE_AUTOGEN_ENABLED` | boolean | false | In-process midnight cron |
| `COMPLIANCE_AUTOGEN_CRON_SECRET` | string? | — | HTTP autogen header auth |
| `REPORT_JOBS_ENABLED` | boolean | true | Report job poller |

### Mail env (separate module `config/mail.ts`)

| Variable | Default |
|----------|---------|
| `MAIL_ENABLED` | false |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | — |
| `SMTP_FROM` | `MAMS <noreply@makson-group.com>` |

---

## Render Blueprint (`render.yaml`)

Production defaults for `mams-api` service:

| Key | Value |
|-----|-------|
| `NODE_ENV` | production |
| `NODE_VERSION` | 20 |
| `TZ` | Asia/Kolkata |
| `JWT_ACCESS_EXPIRES` | 15m |
| `JWT_REFRESH_EXPIRES` | 7d |
| `SMART_ANCHOR_VERSION` | v2.0.0 |
| `FEATURE_UNMASK_ENABLED` | true |
| `COMPLIANCE_AUTOGEN_ENABLED` | **false** |
| `REPORT_JOBS_ENABLED` | true |
| `MAIL_ENABLED` | false |
| `CORS_ORIGIN` | https://maksonhrms.netlify.app |
| `PUBLIC_APP_URL` | https://maksonhrms.netlify.app |

**Dashboard secrets:** `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`

**Startup warning:** If `CORS_ORIGIN` contains `localhost` in production, server logs warning to set Netlify URL.

---

## Web Build Env (`mams-web`)

| Variable | Default | Parsed by |
|----------|---------|-----------|
| `VITE_FEATURE_UNMASK_ENABLED` | true | `config/featureFlags.ts` |
| `VITE_FEATURE_AUTOGEN_DEMO_ENABLED` | true | `config/featureFlags.ts` |

**Deploy snippet:** Generated by `getFeatureFlagsResponse().deploySnippet` — copy/paste for Render + Netlify dashboards.

---

## Admin Feature Flags API

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/admin/feature-flags` | `manage.feature_flags` |
| PATCH | `/api/admin/feature-flags` | `manage.feature_flags` |

**PATCH body:** `{ flagId, enabled }` or `{ changes: { unmaskEnabled: false, … } }`

**Response:** `{ flags, summary, lastUpdated, deploySnippet }`

**Audit:**
- Runtime flags → `feature_flags_changed`
- Settings flags → `settings_changed` with `via: 'feature_flags_console'`

---

## Dev vs Production Behavioral Differences

| Concern | Development | Production |
|---------|-------------|------------|
| CORS | localhost:5173 auto-allowed | Only `CORS_ORIGIN` + `PUBLIC_APP_URL` |
| Morgan logging | `dev` format | `combined` |
| Compliance cron | Usually off (.env) | Off in render.yaml |
| Mail | Typically disabled | Disabled in render.yaml |
| Feature flags | Env defaults; Mongo overrides after first admin toggle | Same |
| Login rate limit | Custom `keyGenerator` for Vite proxy | `trust proxy` + real IP |

---

## Cross-References

- Admin flags UI: [11-admin-console-workflows.md](./11-admin-console-workflows.md)
- Background jobs gated by env: [15-background-jobs.md](./15-background-jobs.md)
- Unmask edge cases: [19-edge-cases-retries.md](./19-edge-cases-retries.md)
