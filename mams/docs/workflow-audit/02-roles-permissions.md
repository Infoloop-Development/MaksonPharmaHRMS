# Roles & Permissions

Source: `shared/types/src/rbac.ts`, `permissionHelpers.ts`, `user.ts`, route middleware, frontend gates.

---

## Roles

| Role | Label | Default viewMode | Default home |
|------|-------|------------------|--------------|
| `org.admin` | Organization Admin | `real` | `/admin` |
| `hr.admin` | HR Admin | `real` | `/dashboard` |
| `hr.compliance` | Compliance Auditor | `compliant` | `/dashboard` |
| `it.admin` | IT Admin | `real` | `/dashboard` |

**viewMode** is assigned at user creation: `hr.compliance` → `compliant`; all others → `real`. It affects JWT claims and attendance/report field projection. It is **not** a permission.

---

## Permissions (28)

### Governance (`ORG_GOVERNANCE`)
| Permission | Description |
|------------|-------------|
| `manage.org_users` | Create/edit users (replaces legacy `manage.users` for admin CRUD) |
| `manage.org_settings` | Organization settings PATCH |
| `manage.security` | Revoke sessions |
| `read.org_audit` | Full org audit log |
| `manage.feature_flags` | Runtime feature toggles |
| `read.system_health` | Health + admin overview APIs |
| `manage.export_naming` | Export filename patterns |

### HR Operational (`HR_OPERATIONAL`)
| Permission | Description |
|------------|-------------|
| `read.real` | Real (12h) attendance view |
| `read.compliant` | Compliant (8h) attendance + compliance modules |
| `write.adjust` | Create attendance adjustments |
| `approve.adjust` | Approve/reject adjustments |
| `write.regularization` | Create regularization requests |
| `approve.regularization` | Approve/reject regularization |
| `unmask.sensitive` | Reveal masked employee fields (with grants) |
| `manage.employees` | Employee CRUD + CSV import |
| `manage.devices` | Device CRUD, test, sync |
| `read.leave` | View leave data |
| `write.leave` | Apply for leave |
| `approve.leave` | Approve/reject/cancel leave |
| `manage.leave` | Leave types, holidays, quota config |
| `read.visitors` | View visitor requests |
| `approve.visitors` | Approve/reject visitor requests |
| `manage.visitors` | Visitor form CRUD |

### Additional (in caps, not all in defaults)
| Permission | Description |
|------------|-------------|
| `manage.settings` | Legacy alias in org.admin cap |
| `manage.users` | Legacy alias for user management |
| `read.compliance_activity` | Compliance activity log page |
| `approve.employee_change` | Decide employee change requests |
| `write.employee_change` | Submit employee change requests |

---

## Default Permissions by Role (`PERMISSIONS_BY_ROLE`)

### org.admin
All `ORG_GOVERNANCE` + all `HR_OPERATIONAL` (full system access by default).

### hr.admin
`read.real`, `write.adjust`, `write.regularization`, `approve.regularization`, `unmask.sensitive`, `manage.employees`, `manage.devices`, `manage.leave`, `read.visitors`, `approve.visitors`, `manage.visitors`, `read.compliance_activity`, `approve.employee_change`

**Not in default:** `read.compliant`, `approve.adjust`, `approve.leave`, `write.leave`, governance permissions.

### hr.compliance
`read.compliant`, `approve.adjust`, `approve.regularization`, `approve.leave`, `read.leave`, `read.visitors`, `approve.visitors`, `write.employee_change`

**Not in default:** employee direct CRUD, device management, leave write, governance.

### it.admin
`read.real`, `manage.devices`, `manage.leave`

---

## Maximum Assignable Cap (`ROLE_PERMISSION_CAP`)

Custom permissions on user create/update must be ⊆ cap for role.

| Permission | org.admin | hr.admin | hr.compliance | it.admin |
|------------|:---------:|:--------:|:-------------:|:--------:|
| manage.org_users | ✓ | — | — | — |
| manage.org_settings | ✓ | — | — | — |
| manage.security | ✓ | — | — | — |
| read.org_audit | ✓ | — | — | — |
| manage.feature_flags | ✓ | — | — | — |
| read.system_health | ✓ | — | — | — |
| manage.export_naming | ✓ | — | — | — |
| manage.settings | ✓ | — | — | — |
| manage.users | ✓ | — | — | — |
| read.real | ✓ | ✓ | — | ✓ |
| read.compliant | ✓ | ✓ | ✓ | — |
| write.adjust | ✓ | ✓ | — | — |
| approve.adjust | ✓ | ✓ | ✓ | — |
| write.regularization | ✓ | ✓ | — | — |
| approve.regularization | ✓ | ✓ | ✓ | — |
| unmask.sensitive | ✓ | ✓ | — | — |
| manage.employees | ✓ | ✓ | — | — |
| manage.devices | ✓ | ✓ | — | ✓ |
| read.leave | ✓ | ✓ | ✓ | ✓ |
| write.leave | ✓ | ✓ | — | ✓ |
| approve.leave | ✓ | ✓ | ✓ | ✓ |
| manage.leave | ✓ | ✓ | — | ✓ |
| read.visitors | ✓ | ✓ | ✓ | — |
| approve.visitors | ✓ | ✓ | ✓ | — |
| manage.visitors | ✓ | ✓ | — | — |
| read.compliance_activity | — | ✓ | — | — |
| approve.employee_change | — | ✓ | — | — |
| write.employee_change | — | — | ✓ | — |

Validation: `validatePermissionsForRole()` — non-empty, all in cap.

---

## Role × Screen Access (Effective)

| Screen | org.admin | hr.admin | hr.compliance | it.admin |
|--------|:---------:|:--------:|:-------------:|:--------:|
| Admin console | ✓ | If delegated perm | — | — |
| Dashboard | ✓ | ✓ | ✓ (compliant) | ✓ |
| Employees | ✓ | ✓ CRUD | Read + change requests | Read |
| Attendance (real) | ✓ | ✓ | — | ✓ |
| Compliance attendance | ✓ | If `read.compliant` | ✓ | — |
| Reports | ✓ | ✓ | ✓ (compliant cols) | ✓ |
| Adjustments route | ✓ | ✓ | ✓ | — |
| Regularization | ✓ | ✓ write+approve | approve only | — |
| Leave | ✓ | ✓ | approve+read | devices+leave |
| Visitors | ✓ | ✓ | read+approve | — |
| Devices | ✓ | ✓ | — | ✓ |
| Compliance activity | ✓ | If perm | — | — |
| Employee change requests | ✓ | approve | write | — |
| Settings | ✓ HR | ✓ HR | ✓ profile only | ✓ HR |

Nav may show links before page-level permission blocks — API enforces final access.

---

## Role × API Namespace

| Namespace | Typical gate |
|-----------|--------------|
| `/api/auth/*` | Public login/refresh; JWT for rest |
| `/api/users/*` | `manage.org_users` / `manage.users` |
| `/api/employees/*` | Auth read; `manage.employees` write |
| `/api/employee-change-requests/*` | `write.employee_change` / `approve.employee_change` |
| `/api/attendance/*` | Auth (viewMode projection) |
| `/api/adjustments/*` | `write.adjust` / `approve.adjust` |
| `/api/compliance-attendance/*` | `read.compliant`; org.admin for patch |
| `/api/leave/*` | Mixed per route |
| `/api/regularization/*` | write/approve permissions |
| `/api/visitors/*` | manage/read/approve.visitors |
| `/api/devices/*` | Auth read; `manage.devices` write |
| `/api/dashboard/*` | Auth |
| `/api/reports/*` | Auth |
| `/api/settings` | Auth read; `manage.org_settings` patch |
| `/api/admin/*` | Governance permissions |
| `/api/admin/overview/*` | Entire router: `read.system_health` |
| `/api/activity/*` | Auth; org needs `read.org_audit` or `read.compliance_activity` |
| `/api/notifications/*` | **Role `org.admin` only** (not permission-based) |
| `/iclock/*`, `/integrations/hanvon/*` | Device serial/token (no JWT) |

---

## Special Cases

### Unmask (`unmask.sensitive`)
- Only `hr.admin` can receive field-level grants (`unmaskFieldGrants`).
- `permissionsWithUnmaskGrants()`: HR Admin gets `unmask.sensitive` only when grants non-empty.
- `FEATURE_UNMASK_ENABLED=false` strips permission from JWT session via `filterPermissionsForSession()`.
- Unmask API returns **404** `feature_disabled` when flag off.
- Each unmask attempt requires actor password; logged in `UnmaskAudit`.

### Admin Console Access
`canAccessAdminConsole(role, permissions)` true if:
- `role === 'org.admin'`, OR
- Any of: `manage.org_users`, `manage.org_settings`, `read.org_audit`, `manage.security`, `manage.feature_flags`, `read.system_health`

### Notifications API
Gated by **role === org.admin**, not a permission string.

### Compliance View Filtering
Employee change request list: `viewMode === 'compliant'` → filter `initiatedBy = current user`.

### Last Org Admin Protection
Cannot deactivate or demote last active `org.admin` → **400** `last_org_admin`.

### Session Revocation Triggers
- Admin changes user role, permissions, `isActive`, or `mustChangePassword`
- Admin revokes sessions explicitly
- User changes own password (all refresh tokens revoked)

### Legacy Permission Aliases
`hasManageOrgUsersPermission()` accepts `manage.org_users` OR `manage.users`.

---

## Frontend Enforcement Points

| Location | Check |
|----------|-------|
| `App.tsx` RequireAuth | `mustChangePassword` gate |
| `AdminLayout` | `canAccessAdminConsole` |
| `Sidebar.tsx` | Permission-based nav items |
| Page components | `useAuth` permissions for buttons/modals |
| `SettingsGate` | viewMode for settings vs profile |
| `isAutogenDemoEnabled()` | Route registration |

Backend middleware (`requireAuth`, `requirePermission`, `requireAnyPermission`) is authoritative.
