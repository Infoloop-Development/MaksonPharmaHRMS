# Workflow Documentation Template

Use this structure for every user-facing workflow in files `03`–`13`.

```
WORKFLOW: [Name]
ROLES: [who can start / complete]
PRECONDITIONS: [auth, viewMode, permissions, feature flags]

STEP 1 — [Screen/action]
  - UI: fields, buttons, validation (from Zod schemas in shared/types + frontend forms)
  - Branch A if … / Branch B if …
  - API: METHOD /path → request body → response
  - DB: collections read/written, key fields changed
  - Business rules: service functions, formulas, thresholds
  - Errors: HTTP status, user-visible message
  - Success: next screen or state

STEP 2 — …
FINAL OUTCOME: …
```

## Conventions

- **API paths** are relative to server base (`/api/...` unless noted, e.g. `/iclock`).
- **Auth** means Bearer JWT access token unless route is public or device push.
- **viewMode** (`real` | `compliant`) is on the JWT and affects attendance/report projections; it is separate from permissions.
- **IST** = `Asia/Kolkata` — all calendar dates in HR workflows use IST unless stated.
- **N/A in MAMS:** public signup, payment/transaction flows, SMS/push notifications, external object storage (files in MongoDB).
