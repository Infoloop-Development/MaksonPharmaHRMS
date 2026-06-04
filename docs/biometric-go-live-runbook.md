# Biometric go-live runbook (MAMS)

Use this checklist when turning on live attendance at a factory. MAMS does **not** enroll fingerprints in the web app — that happens on the physical device.

## ID alignment rule

```text
MAMS Employee → Biometric ID  ===  User ID on the biometric device
```

- eSSL sends the first column of `ATTLOG` as the user ID.
- Hanvon sends JSON `userId`.
- Employee code (`MKS0001`) is **not** used for punch matching.

Agree one scheme with IT before rollout (e.g. `42` on device and `42` in MAMS, or `BIO042` in both places). Values must match **exactly** (string equality).

---

## Phase 1 — Employees in MAMS (HR)

1. Decide biometric ID scheme with IT (export from device software or planned PIN list).
2. Load employees:
   - **Bulk:** Employees → Import CSV — column `biometricId` must be unique.
   - **Manual:** Add employee — Biometric ID on step 1.
3. Download template from Import CSV if needed.
4. Confirm each active employee has a non-empty Biometric ID in the Employees list.

---

## Phase 2 — Enroll on hardware (IT / vendor)

1. For each employee, enroll fingerprint or face on **each** device they will use.
2. Use the **same user ID** as MAMS Biometric ID when creating the user on the device.
3. MAMS does not push user lists to devices in Phase 1 — enrollment is only on vendor tools.

---

## Phase 3 — Register devices in MAMS (HR + IT)

1. HR: **Devices** → **+ Register device** (serial, department, location, vendor).
2. IT: Copy server URL / Hanvon token from the post-register checklist.
3. IT: Configure device network:
   - **eSSL:** ADMS push URL → `https://<your-host>/iclock/cdata`
   - **Hanvon push:** POST to `/integrations/hanvon/push` with `X-Device-Serial` and `X-Device-Token`
   - **Hanvon pull:** Set pull base URL → **Test** then **Sync Now** in MAMS
4. Confirm connection state in **Devices**:
   - Pending setup → Waiting for first punch → **Live**

---

## Phase 4 — Pilot punch test

1. Pick one employee already in MAMS with matching device enrollment.
2. Scan finger/face once.
3. Verify:
   - **Devices** shows **Live** (punch in last 24h).
   - **Attendance Log** shows a row for that employee.
4. If punch missing: check **Unmapped punches** on Devices (unknown biometric ID) and fix Biometric ID in Employees, then re-punch.

---

## Phase 5 — Full rollout

1. Repeat phases 1–4 per location.
2. Monitor orphan punch alerts daily for the first week.
3. Use **Go-live readiness** on Devices: active employees with no punch in N days may need device enrollment or ID fixes.

---

## Troubleshooting

| Symptom | Likely cause | Action |
|---------|----------------|--------|
| Device stays Pending setup | Wrong URL, firewall, serial not registered | Fix network; verify serial in MAMS |
| Waiting for first punch, no attendance | No successful matched punches | Pilot one known employee |
| Unmapped punch in Devices | Biometric ID mismatch | Align MAMS + device ID; employee re-punches |
| Duplicate CSV row | Same biometricId or empCode | Fix source file; re-import |

---

## Reference

- Device matrix: [device-compatibility-matrix.md](./device-compatibility-matrix.md)
- App setup: [mams/README.md](../mams/README.md)
