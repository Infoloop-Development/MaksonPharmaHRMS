# Auth, Session & Onboarding Workflows

Source: `mams-server/src/routes/auth.routes.ts`, `mams-server/src/services/auth.service.ts`, `mams-server/src/middleware/auth.ts`, `mams-server/src/utils/passwordPolicy.ts`, `shared/types/src/user.ts`, `mams-web/src/pages/Login.tsx`, `mams-web/src/App.tsx`.

**N/A in MAMS:** public self-signup; accounts are provisioned by org admins via `/api/users`.

---

## Collections

| Collection | Purpose |
|------------|---------|
| `users` | Credentials, role, viewMode, permissions, onboarding state, theme |
| `refresh_tokens` | Hashed refresh tokens (7-day TTL, single-use rotation) |
| `audit_logs` | `login`, `login_failed`, `logout`, `password_changed` events |

---

## Zod Schemas (`@mams/types`)

| Schema | Fields / rules |
|--------|----------------|
| `LoginRequestSchema` | `email` (email), `password` (min 1) |
| `RefreshRequestSchema` | `refreshToken` (string) |
| `ChangePasswordRequestSchema` | `currentPassword`, `newPassword` (min 1 each); server extends `newPassword` with `PasswordSchema` |
| `PasswordSchema` (server) | 10–128 chars; score ≥ 3 of: lowercase, uppercase, digit, symbol (`!@#$%^&*…`) |
| `CompleteOnboardingTourSchema` | `tour`: one of `dashboard`, `employees`, `attendance`, `reports`, `adjustments`, `regularization`, `leave`, `visitors`, `devices`, `settings`, `admin-overview` |
| `UpdatePreferencesRequestSchema` | `themePreference?`: `light` \| `dark` \| `system` (at least one required) |

---

## Business Rules (auth.service)

- **Account lockout:** After 5 failed password attempts → `lockedUntil` = now + 15 minutes (`LOCKOUT_THRESHOLD=5`, `LOCKOUT_DURATION_MS=15min`).
- **Login success:** Resets `failedLoginCount`, clears `lockedUntil`, sets `lastLoginAt`, `isFirstLogin = !lastLoginAt` (before save).
- **JWT access claims:** `sub`, `role`, `viewMode`, `permissions` (filtered by runtime feature flags via `filterPermissionsForSession`).
- **Refresh rotation:** Used token revoked (`revokedAt`); new refresh token issued; old token cannot be reused.
- **Change password:** Revokes **all** active refresh tokens for user (forces re-login on other devices).
- **Permissions backfill:** `ensureUserRoleDefaultPermissions` runs on login, refresh, and `/me`.

---

## WORKFLOW: Login

**ROLES:** Any provisioned user (all roles).

**PRECONDITIONS:** User exists, `isActive=true`, account not locked.

### STEP 1 — Login screen (`/login`)

- **UI:** Email, password; client calls login API.
- **API:** `POST /api/auth/login`
  - Body: `LoginRequestSchema`
  - Response 200: `{ user: UserPublic, accessToken, refreshToken, isFirstLogin? }`
- **DB:** Read `users`; write `failedLoginCount`/`lockedUntil` on failure; on success write `lastLoginAt`, create `refresh_tokens` row (`tokenHash`, `expiresAt` +7d, `issuedFromIp`).
- **Business rules:** Email matched case-insensitively; bcrypt password compare.
- **Errors:**
  - 401 `invalid_credentials` — "Invalid email or password" (unknown/inactive user or bad password)
  - 423 `account_locked` — "Account is temporarily locked. Try again in 15 minutes."
  - 429 — rate limit on `/api/auth/login` (app-level login limiter)
- **Success branches:**
  - `user.mustChangePassword` → `/change-password`
  - `isFirstLogin` → first-login onboarding session flag (client)
  - Else → `defaultHomePath(role)` (`org.admin` → `/admin`, others → `/dashboard`)

### STEP 2 — Store session (client)

- **UI:** Persist `accessToken`, `refreshToken`; attach `Authorization: Bearer <accessToken>` on API calls.
- **Success:** Authenticated app shell.

**FINAL OUTCOME:** Valid JWT session; user lands on home or forced password change.

---

## WORKFLOW: Token Refresh

**ROLES:** Any authenticated client with a valid refresh token.

**PRECONDITIONS:** Refresh token not revoked/expired; user still active.

### STEP 1 — Silent refresh (client interceptor)

- **API:** `POST /api/auth/refresh`
  - Body: `{ refreshToken }`
  - Response 200: `{ user, accessToken, refreshToken }` (new pair)
- **DB:** Revoke old refresh row; insert new refresh row with `rotatedFromTokenHash`.
- **Errors:** 401 `invalid_refresh_token` — "Refresh token invalid or expired" or "User no longer active"

**FINAL OUTCOME:** Rotated tokens without re-entering password.

---

## WORKFLOW: Logout

**ROLES:** Authenticated user.

**PRECONDITIONS:** Bearer access token + refresh token in body.

### STEP 1 — Logout action

- **API:** `POST /api/auth/logout` (Auth required)
  - Body: `{ refreshToken }`
  - Response: 204 No Content
- **DB:** Set `revokedAt` on matching `refresh_tokens` row; audit `logout`.
- **Errors:** 401 unauthenticated / invalid access token

**FINAL OUTCOME:** Refresh token revoked; client clears local tokens.

---

## WORKFLOW: Session Validation (`/me`)

**ROLES:** Authenticated user.

### STEP 1 — App bootstrap / profile refresh

- **API:** `GET /api/auth/me`
  - Response 200: `{ auth: AuthClaims, user: UserPublic }`
- **DB:** Read `users`; backfill default permissions if needed.
- **Errors:** 401 `session_invalid` — "Account is inactive or unavailable"

**FINAL OUTCOME:** Fresh user profile and JWT claims for UI gating.

---

## WORKFLOW: Forced / Voluntary Password Change

**ROLES:** Authenticated user (`mustChangePassword` forces route guard).

**PRECONDITIONS:** `App.tsx` and layouts redirect to `/change-password` when `user.mustChangePassword`.

### STEP 1 — Change password form

- **UI:** Current password, new password, confirm (client-side policy mirror).
- **API:** `POST /api/auth/change-password`
  - Body: `ChangePasswordBodySchema` = `ChangePasswordRequestSchema` + `PasswordSchema` on `newPassword`
  - Response 200: `{ user: UserPublic }` with `mustChangePassword: false`
- **DB:** Update `passwordHash`; set `mustChangePassword=false`; revoke all refresh tokens.
- **Business rules:** New password must differ from current; `PasswordSchema` enforced server-side.
- **Errors:**
  - 400 `invalid_password` — policy message from Zod
  - 400 `same_password` — "New password must be different from your current password"
  - 401 `invalid_credentials` — "Current password is incorrect"
  - 401 `unauthorized` — inactive user

**FINAL OUTCOME:** Password updated; user can access main app; other sessions invalidated.

---

## WORKFLOW: Onboarding Product Tours

**ROLES:** Authenticated users per page.

**PRECONDITIONS:** Client "Give me a tour" buttons per module; first-login session may auto-prompt.

### STEP 1 — Complete a tour

- **UI:** Driver.js tour on dashboard, employees, attendance, etc.
- **API:** `POST /api/auth/onboarding/complete`
  - Body: `{ tour: OnboardingTourId }`
  - Response 200: `{ user }` with `completedOnboardingTours` updated
- **DB:** `$addToSet` on `users.completedOnboardingTours`.
- **Errors:** 401 unauthorized; 400 Zod validation on unknown tour id

**FINAL OUTCOME:** Tour id persisted; UI won't re-offer completed tour.

---

## WORKFLOW: Theme Preferences

**ROLES:** Authenticated user.

### STEP 1 — Update theme

- **API:** `PATCH /api/auth/preferences`
  - Body: `UpdatePreferencesRequestSchema`
  - Response 200: `{ user }` with `themePreference`
- **DB:** Update `users.themePreference`.
- **Errors:** 400 `validation_error` — "Provide at least one preference to update"

**FINAL OUTCOME:** Theme preference saved (`light` | `dark` | `system`).

---

## API Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/refresh` | Public | Rotate tokens |
| POST | `/api/auth/logout` | Bearer | Revoke refresh token |
| GET | `/api/auth/me` | Bearer | Profile + claims |
| POST | `/api/auth/change-password` | Bearer | Change password |
| POST | `/api/auth/onboarding/complete` | Bearer | Mark tour complete |
| PATCH | `/api/auth/preferences` | Bearer | Theme preference |

---

## Security Notes

- Access token: JWT signed with `JWT_ACCESS_SECRET`; expiry from `JWT_ACCESS_EXPIRES`.
- Refresh token: Separate secret; stored as SHA-256 hash only.
- No public registration endpoint; user provisioning is admin workflow (`/api/users`, documented separately).
- `viewMode` on JWT affects data projection (e.g. employees hide `timeShift` in compliant mode) but is not a permission.
