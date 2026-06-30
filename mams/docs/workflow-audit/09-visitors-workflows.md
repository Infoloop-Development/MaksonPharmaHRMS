# Visitors Workflows

Source: `mams-server/src/routes/visitors.routes.ts`, `publicVisitor.routes.ts`, `shared/types/src/visitor.ts`, `visitAccess.ts`, `visitorLocales.ts`, `visitorIntroMedia.ts`.

Visitor management has two surfaces: **authenticated HR** (`/api/visitors`) and **public form** (`/api/public/visitor-forms/:slug`).

---

## Collections

| Collection | Purpose |
|------------|---------|
| `visitor_forms` | Form definitions, fields, intro media, public slug, translations |
| `visitor_requests` | Submissions and approval state |
| `visitor_files` | Binary file storage in MongoDB (intro + field uploads) |
| `audit_logs` | Form CRUD, slug regeneration, request submitted/approved/rejected |

**N/A in MAMS:** External object storage; files stored in `visitor_files.data` buffer.

---

## Permissions

| Action | Permission |
|--------|------------|
| Forms summary (dropdown) | `read.visitors` OR `approve.visitors` OR `manage.visitors` |
| Form CRUD, intro upload | `manage.visitors` |
| List/view requests | `read.visitors` OR `approve.visitors` OR `manage.visitors` |
| Approve/reject requests | `approve.visitors` OR `manage.visitors` |
| Download files | same as read requests |
| Public submit | None (rate-limited) |

---

## Zod Schemas

### Form fields (`VisitorFieldSchema`)

| Field | Rules |
|-------|-------|
| `id` | unique within form |
| `type` | short_text, long_text, email, phone, date, time, dropdown, radio, checkbox, file |
| `label` | 1–200 chars |
| `required` | boolean default false |
| `options` | required for dropdown/radio/checkbox (min 1) |
| `order` | int ≥ 0 |
| `maxFileBytes` | 1–5_242_880 for file fields |

### Form create/update

| Schema | Rules |
|--------|-------|
| `VisitorFormCreateSchema` | `title` 1–200; `description?`; `intro?`; `multilingual?`; `fields` 1–100; `isActive` default true; intro URL/upload validation |
| `VisitorFormUpdateSchema` | Partial + `slugStrategy`: `keep` \| `regenerate` (at least one field required) |

### Intro media

- Image: url or upload (`storageKey`); max 5MB on admin upload
- Video: youtube, loom, or upload; per-locale (`en`, `gu`, `hi`); max 25MB upload
- `viewingMandatory` on video → public submit requires `introAttestation`

### Request approval

| Schema | Rules |
|--------|-------|
| `VisitorRequestApproveSchema` | `approverNote?`; `visitAccess?` discriminated union |
| `VisitorVisitAccessSchema` | `default` \| `duration` (hours 0–72) \| `until` (date + HH:mm IST) |
| `VisitorRequestRejectSchema` | `approverNote` required 1–2000 |

### Public submit (`VisitorPublicSubmitSchema`)

- `responses`: record of string | string[] | null
- `fileRefs`: `[{ fieldId, storageKey }]`
- `introAttestation?`: `{ videoCompleted: true, completedAt: ISO datetime }`
- `locale?`: `en` | `gu` | `hi`

### List query (`VisitorRequestListQuerySchema`)

`status`, `formId`, `search`, `startDate`, `endDate`, pagination.

---

## Visit Access Resolution (`resolveVisitValidUntil`)

On approve:

| mode | visitValidUntil |
|------|-----------------|
| `default` (or omitted) | 18:00 IST today, or tomorrow 18:00 if already past 18:00 IST |
| `duration` | `decidedAt + durationHours` |
| `until` | Parsed IST date + time → UTC instant |

Stored: `visitValidUntil`, `visitAccessMode`, `visitDurationHours`.

---

## WORKFLOW: Create Visitor Form

**ROLES:** `manage.visitors`.

### STEP 1 — Form builder

- **UI:** Title, description, multilingual toggle, field builder, intro image/video, active flag.
- **API:** `POST /api/visitors/forms`
  - Body: `VisitorFormCreateSchema`
  - Response 201: enriched form with `publicUrl`, `formVersion: 1`
- **DB:** Generate unique `publicSlug`; `refreshFormTranslations` for gu/hi; validate intro storage keys if upload refs.
- **Business rules:** Duplicate field ids rejected; intro upload keys must exist in `visitor_files` (unconsumed).
- **Errors:** 400 `invalid_intro`; Zod field/intro errors

**FINAL OUTCOME:** Active form with public QR/link URL.

---

## WORKFLOW: Edit Form / Regenerate Slug

**ROLES:** `manage.visitors`.

### STEP 1 — Update form

- **API:** `PATCH /api/visitors/forms/:id`
  - Body: `VisitorFormUpdateSchema`
  - On `slugStrategy: regenerate`: old slug moved to `retiredSlugs[]`, new slug issued, `formVersion++`
- **DB:** Rebuild translations after save.

### STEP 2 — Toggle active

- **API:** `PATCH /api/visitors/forms/:id/toggle-active` — flips `isActive`

### STEP 3 — Archive

- **API:** `DELETE /api/visitors/forms/:id` → 204 (`isArchived=true`, `isActive=false`)

### STEP 4 — Intro media upload (admin)

- **API:** `POST /api/visitors/forms/:id/intro-upload` multipart
  - Fields: `kind` image|video, `locale` for video, `file`
  - Limits: image 5MB; video 25MB; mime allowlists
  - Response 201: `{ storageKey, filename, mimeType, size, intro }`

**FINAL OUTCOME:** Updated form; retired slugs return 410 on public access.

---

## WORKFLOW: Public Visitor Submission

**ROLES:** Anonymous visitor.

**PRECONDITIONS:** Form `isActive`; valid slug; rate limits (30 GET/min, 10 submit/min, 5 upload/min per IP).

### STEP 1 — Load form

- **API:** `GET /api/public/visitor-forms/:slug`
  - Response: serialized public form (locale content, intro for locale)
- **Branch A — retired slug:** 410 `link_retired`
- **Branch B — inactive:** 403 `form_inactive`
- **Branch C — not found:** 404

### STEP 2 — Load intro media (if upload-based)

- **API:** `GET /api/public/visitor-forms/:slug/intro-media/:storageKey`

### STEP 3 — Upload field files

- **API:** `POST /api/public/visitor-forms/:slug/upload` multipart
  - `fieldId` + `file`; max 5MB route limit; field `maxFileBytes` default 2MB
  - Response 201: `{ storageKey, filename, size, mimeType }`

### STEP 4 — Submit

- **API:** `POST /api/public/visitor-forms/:slug/submit`
  - Body: `VisitorPublicSubmitSchema`
  - Validates responses via `validateVisitorResponses`; intro via `validateIntroAttestation`
  - Marks file refs `consumed: true`
  - Response 201: `{ ok: true, message: "…awaiting review." }`
- **DB:** Create `visitor_requests` status Pending; snapshot `fieldsSnapshot`, `formVersion`; audit `visitor_request_submitted`; notify org admins.
- **Errors:**
  - 400 `validation_error` + field errors
  - 400 `intro_video_required`
  - 400 `invalid_file_ref`
  - 410/403 as above

**FINAL OUTCOME:** Pending visitor request in HR queue.

---

## WORKFLOW: Review Visitor Requests

**ROLES:** `read.visitors` / `approve.visitors`.

### STEP 1 — List requests

- **API:** `GET /api/visitors/requests?status=&formId=&search=&startDate=&endDate=`
  - Response: items + status counts

### STEP 2 — Detail with audit trail

- **API:** `GET /api/visitors/requests/:id`
  - Response: `{ item, auditTrail }`

### STEP 3 — Download attachment

- **API:** `GET /api/visitors/files/:storageKey` — streams file from `visitor_files`

**FINAL OUTCOME:** HR reviews submission and attachments.

---

## WORKFLOW: Approve Visitor Request

**ROLES:** `approve.visitors` or `manage.visitors`.

### STEP 1 — Approve with access window

- **UI:** Optional note; visit access mode (default / duration / until datetime).
- **API:** `PATCH /api/visitors/requests/:id/approve`
  - Body: `VisitorRequestApproveSchema`
- **DB:** status Approved; `visitValidUntil`, `visitAccessMode`, `visitDurationHours`; audit `visitor_request_approved`.
- **Errors:** 404 pending request not found

**FINAL OUTCOME:** Approved visit with computed validity window.

---

## WORKFLOW: Reject Visitor Request

**ROLES:** `approve.visitors`.

### STEP 1 — Reject with reason

- **API:** `PATCH /api/visitors/requests/:id/reject`
  - Body: `VisitorRequestRejectSchema`
- **DB:** status Rejected; audit `visitor_request_rejected`.

**FINAL OUTCOME:** Request closed.

---

## Response Validation Rules (`validateVisitorResponses`)

Per field type:

- Required empty → "This field is required"
- email → regex validation
- phone → `^[+]?[\d\s()-]{7,20}$`
- date → `YYYY-MM-DD`
- time → `HH:mm`
- dropdown/radio/checkbox → value must be in `options`
- file → satisfied by `fileRefs` not empty response text

---

## API Summary (Authenticated)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/visitors/forms/summary` | read/approve/manage.visitors |
| GET/POST | `/api/visitors/forms` | manage.visitors |
| GET/PATCH/DELETE | `/api/visitors/forms/:id` | manage.visitors |
| POST | `/api/visitors/forms/:id/intro-upload` | manage.visitors |
| PATCH | `/api/visitors/forms/:id/toggle-active` | manage.visitors |
| GET | `/api/visitors/requests` | read/approve/manage.visitors |
| GET | `/api/visitors/requests/:id` | read/approve/manage.visitors |
| PATCH | `/api/visitors/requests/:id/approve` | approve.visitors |
| PATCH | `/api/visitors/requests/:id/reject` | approve.visitors |
| GET | `/api/visitors/files/:storageKey` | read/approve/manage.visitors |

## API Summary (Public)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/public/visitor-forms/:slug` | Rate limit |
| GET | `/api/public/visitor-forms/:slug/intro-media/:storageKey` | Rate limit |
| POST | `/api/public/visitor-forms/:slug/upload` | Rate limit |
| POST | `/api/public/visitor-forms/:slug/submit` | Rate limit |

---

## Notifications

- Public submit → `notifyOrgAdmins` with form title and slug.
- No SMS/push to visitor in MAMS (in-app admin notifications only).
