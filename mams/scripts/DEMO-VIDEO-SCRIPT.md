# MAMS biometric demo video — recording script (~2 min)

## Before you record

1. PC on same Wi‑Fi as device (`192.168.1.17`).
2. **Stop** HTTP bridge if running (not needed for demo).
3. Browser open: https://maksonhrms.netlify.app — logged in as HR admin.
4. Windows screen recorder: **Win + G** (Xbox Game Bar) or OBS.
5. Zoom browser to **125%** so text is readable on video.
6. **Do not run sync yet** — punch first during the recording.

---

## Scene 1 — MAMS login (10 sec)

- Show login → dashboard.
- Say: *"This is Makson HRMS — live on Netlify."*

---

## Scene 2 — Employee setup (15 sec)

- Go to **Employees** → search **Prem Mehta** (MKS1805).
- Point at **Biometric ID = 3**.
- Say: *"Each employee has a biometric ID that must match the device user ID."*

---

## Scene 3 — Device registered (15 sec)

- Go to **Devices** → **Prem Sample** (serial TFDB244700544).
- Show location / department / Online status.
- Say: *"The factory device is registered in MAMS."*

---

## Scene 4 — Attendance before punch (15 sec)

- Go to **Attendance Log** → filter employee **Prem Mehta**.
- Note the latest time on screen.
- Say: *"We'll punch on the device and sync to cloud."*

---

## Scene 5 — Punch on device (15 sec)

- Cut to device (phone camera) OR describe on mic: scan finger for user **3**.
- Device should show success / thank you.

---

## Scene 6 — Sync to cloud (20 sec)

- Show PowerShell:

```powershell
cd c:\Users\prema\Downloads\MAMS-handoff\MAMS-handoff\mams
powershell -ExecutionPolicy Bypass -File .\scripts\demo-video.ps1
```

- Wait for `uploaded 1/1` or `0 new` (if already synced, punch again first).

---

## Scene 7 — Attendance after (15 sec)

- Refresh **Attendance Log**.
- New row with **today's time** for Prem Mehta / BIO 3.
- Say: *"Punch appears in the live attendance log within seconds."*

---

## Scene 8 — Close (10 sec)

- Optional: **Dashboard** showing today's attendance.
- Say: *"MAMS is ready for factory rollout — device sync can run on a small PC at each site."*

---

## Tips

- Record in one take if possible; pause between scenes is fine.
- If sync shows `0 new`, punch on device once more, then run demo script again.
- Hide test rows (21:42:09 script) by filtering date or narrating they were setup tests.
