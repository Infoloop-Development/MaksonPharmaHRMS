# Device Compatibility Matrix

MAMS Phase 1 supports **eSSL** and **Hanvon** attendance punch ingestion (employee punch capture, not web-app login).

## Supported vendors

| Vendor | Models validated | Protocol | Ingress endpoint | Auth |
|--------|------------------|----------|------------------|------|
| eSSL | SilkBio-101TC, X990, eFace990, K30 Pro | ADMS push | `GET/POST /iclock/cdata` | Serial number whitelist (`devices.serialNumber`) |
| Hanvon | FaceID F710 (SDK) | Push JSON | `POST /integrations/hanvon/push` | `X-Device-Serial` + `X-Device-Token` |
| Hanvon | FaceID F710 (SDK pull mode) | HTTP pull | Admin **Sync Now** → `GET {pullBaseUrl}/api/attendance/logs` | `X-Api-Key` (optional) |

## Rollout gates

1. **Staging** — register device, run `scripts/essl-sim.js` or `scripts/hanvon-sim.js`, confirm raw punches + real 12h view.
2. **Pilot site** — one factory location, 48h soak, orphan biometric rate &lt; 1%.
3. **All locations** — enable remaining devices; monitor `lastSyncStatus` / `lastSyncError` on Devices page.

## Operational runbook

- **eSSL offline** — check device can reach MAMS host on port 443/80; verify serial in Devices registry; confirm `/iclock/cdata` returns `OK`.
- **Hanvon push failures** — verify push token matches `integrationConfig.pushToken`; check `401 invalid_token` in server logs.
- **Hanvon pull failures** — verify `pullBaseUrl` and device HTTP API; use **Test** then **Sync Now** on Devices page.
- **Duplicate punches** — expected to be deduped via `idempotencyKey`; no manual DB edits on `attendance_raw`.

## HR admin setup (Devices)

1. Log in as `hr.admin` → **Devices** (sidebar).
2. Use **+ Register device** with department and factory location.
3. Follow the integration guide on that page; use the table to monitor ONLINE/OFFLINE, connection state, and sync health.
4. Go-live checklist, unmapped punches, and readiness panels are on the same page.

## Simulators (local dev)

```bash
node scripts/essl-sim.js
node scripts/hanvon-sim.js
```
