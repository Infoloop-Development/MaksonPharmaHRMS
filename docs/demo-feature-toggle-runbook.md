# Demo feature toggle runbook

Experimental features are controlled by environment flags (no code deletion). Restore by setting flags back to `true` and restarting.

## Flags

| Flag | App | Default (dev) | Demo (hidden) |
|------|-----|---------------|---------------|
| `FEATURE_UNMASK_ENABLED` | mams-server | `true` | `false` |
| `VITE_FEATURE_UNMASK_ENABLED` | mams-web | `true` | `false` |
| `VITE_FEATURE_AUTOGEN_DEMO_ENABLED` | mams-web | `true` | `false` |

When unmask is disabled: sensitive fields stay **masked**, Unmask UI and Settings toggles are hidden, `POST /api/employees/:id/unmask` returns 404, login session omits `unmask.sensitive`.

When autogen demo is disabled: sidebar link and `/autogeneration-demo` route are removed (URL redirects to dashboard).

---

## Hide for client demo

1. Edit `mams/mams-server/.env`:
   ```
   FEATURE_UNMASK_ENABLED=false
   ```

2. Edit `mams/mams-web/.env`:
   ```
   VITE_FEATURE_UNMASK_ENABLED=false
   VITE_FEATURE_AUTOGEN_DEMO_ENABLED=false
   ```

3. Restart dev servers (Vite reads `VITE_*` only at startup):
   ```powershell
   cd MAMS-handoff\mams
   npm run dev
   ```

4. **Log out and log in** as HR admin (refreshes JWT without unmask permission).

5. Smoke test:
   - No “Auto Genrated Shift Demo” in sidebar; `/autogeneration-demo` does not load the page.
   - Employee detail: masked sensitive fields, no Unmask buttons.
   - Settings → Add/Edit user: no 9 unmask toggles.
   - `POST /api/employees/{id}/unmask` → 404.

---

## Restore after demo

1. Set all three flags to `true` in the `.env` files above.
2. Restart `npm run dev`.
3. Log out and log in as HR admin.
4. Verify: autogen sidebar + page, unmask toggles, Unmask on employee detail, unmask API works.
5. Run `cd mams-server; npm test`.

Do not wipe MongoDB. Grants and audit rows in the database are preserved.
