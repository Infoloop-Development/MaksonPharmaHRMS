# Notifications & Alerts

Source: `notification.service.ts`, `leave/leaveNotification.service.ts`, `mail.service.ts`, `shared/types/src/notification.ts`, `mams-server/src/routes/notifications.routes.ts`.

**N/A in MAMS:** SMS, push notifications, mobile alerts. Only **in-app bell** (org admins) and **optional SMTP email** (welcome mail).

---

## Channel Matrix

| Channel | Recipients | Transport | Config |
|---------|------------|-----------|--------|
| In-app notification | `org.admin` users only | MongoDB `notifications` | `settings.orgNotificationAlerts` |
| Welcome email | Newly created user | Nodemailer SMTP | `MAIL_ENABLED`, SMTP_* env |
| Leave employee email | Employee (intended) | **Not implemented** | `leaveNotification.service` stub |

---

## In-App Notifications (`notification.service.ts`)

### Architecture

```
[Domain event] → build*Notification() → notifyOrgAdmins()
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
            Read settings.orgNotificationAlerts   Find org.admin users   insertMany notifications
            (per-kind toggle)                   (isActive=true)
```

### Notification kinds

| Kind | Default enabled | Title pattern | href | Entity |
|------|-----------------|---------------|------|--------|
| `visitor_submitted` | `visitorSubmitted` | "Visitor request submitted" | `/visitors` | `visitor_request` |
| `leave_applied` | `leaveApplied` | "Leave pending approval" or "Leave application recorded" | `/leave` | `leave_application` |
| `device_registered` | `deviceRegistered` | "New device registered" | `/devices` | `device` |

**Toggle resolution:** `resolveOrgNotificationAlerts(settings)` — missing keys default to `true`. `isNotificationKindEnabled(alerts, kind)` gates insert.

### Trigger points

| Event | Source file | Builder |
|-------|-------------|---------|
| Public visitor form submit | `publicVisitor.routes.ts` | `buildVisitorSubmittedNotification` |
| Leave application created/updated | `leave.routes.ts` | `buildLeaveAppliedNotification` |
| Device registered | `devices.routes.ts` | `buildDeviceRegisteredNotification` |

### Error handling

`notifyOrgAdmins` wraps in try/catch — failures log `Failed to notify org admins` but **do not roll back** the parent transaction.

### Read state lifecycle

```
Unread (readAt=null) → PATCH /:id/read → readAt=now
                     → PATCH /read-all → bulk update
```

---

## Notification API — `/api/notifications`

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/` | `listForUser` — paginated, optional `unreadOnly` |
| GET | `/unread-count` | Badge count |
| PATCH | `/:id/read` | Single mark read (404 if wrong user or already read) |
| PATCH | `/read-all` | Returns `modifiedCount` |

**Auth:** JWT required. Notifications scoped to `userId` — only org admins receive rows, but any user could theoretically have rows if role changed.

**Model:** `notifications` — append-only (`updatedAt: false`); no delete endpoint.

---

## Org Notification Settings (admin)

**Field:** `settings.orgNotificationAlerts`

```typescript
{
  visitorSubmitted: boolean,  // default true
  leaveApplied: boolean,      // default true
  deviceRegistered: boolean,  // default true
}
```

**Edit via:** `PATCH /api/settings` (`manage.org_settings`) or Organization panel in Settings/Admin.

**Audit section:** `org_notifications`

---

## Email — `mail.service.ts`

### Configuration (`config/mail.ts`)

| Env var | Default | Notes |
|---------|---------|-------|
| `MAIL_ENABLED` | false | Master switch |
| `SMTP_HOST` | — | Required when mail enabled |
| `SMTP_PORT` | 587 or 465 | Auto from `SMTP_SECURE` |
| `SMTP_SECURE` | false | TLS |
| `SMTP_USER`, `SMTP_PASS` | optional | Auth if both set |
| `SMTP_FROM` | `MAMS <noreply@makson-group.com>` | From header |
| `APP_PUBLIC_URL` | localhost:5173 | Login link in welcome mail |

**Render default:** `MAIL_ENABLED=false` in `render.yaml`.

### `sendWelcomeUserEmail`

**Trigger:** `POST /api/users` after user creation (`users.routes.ts`)

| Step | Behavior |
|------|----------|
| Pre-check | Returns `{ ok: false, error: 'mail_disabled' }` if `!isMailEnabled()` |
| Content | Plain text + HTML; credentials, login URL, password policy instructions |
| Success | `{ ok: true }` |
| Failure | Log `welcome_email_failed`; audit event `welcome_email_failed` (hidden from activity UI) |

**Security:** Email contains temporary password — admin must use secure channel expectation in copy.

### Transport singleton

`getTransport()` lazily creates Nodemailer transport; `resetMailTransportForTests()` for unit tests.

---

## Leave Notifications — `leaveNotification.service.ts`

**Function:** `notifyLeaveApplied({ employeeId, leaveTypeName, fromDate, toDate, status, totalDays })`

| Step | Current behavior |
|------|------------------|
| Mail disabled | `{ sent: false, error: 'mail_disabled' }` |
| No employee | `{ sent: false, error: 'no_employee' }` |
| Employee found | Logs info only — **Employee model has no email field** |
| Return | `{ sent: false, error: 'employee_email_not_configured' }` |

**Status:** Stub for future employee email; in-app org admin notification still fires via `notifyOrgAdmins`.

---

## Client UI (bell icon)

Notifications consumed by frontend notification bell component (queries `/api/notifications` and `/unread-count`). Deep links use `href` field (`/visitors`, `/leave`, `/devices`).

---

## What Does NOT Notify

| Event | Reason |
|-------|--------|
| Adjustment submitted/approved | No notification kind defined |
| Regularization | Same |
| Employee change request | Same |
| Report job complete | Poll-based UX only |
| Device offline | Health dashboard only |
| Failed login | Audit only (`login_failed`) |

---

## Cross-References

- Settings toggles: [12-dashboard-settings-workflows.md](./12-dashboard-settings-workflows.md)
- Notification model lifecycle: [14-data-lifecycles.md](./14-data-lifecycles.md)
- Mail env: [18-feature-flags-env.md](./18-feature-flags-env.md)
