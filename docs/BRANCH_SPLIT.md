# Feature branch split (3 PRs)

All work is split so you can push and merge independently. **Merge order into `main`:**

1. **Activity Log** (`feature/activity-log`)
2. **Responsive Reports + Activity** (`feature/responsive-reports-activity`) — base: branch 1
3. **Dashboard charts** (`feature/dashboard-charts`) — base: `main` (can merge in parallel with 1, but after 1 is cleaner)

Rename branches when you have final names:

```powershell
git branch -m feature/activity-log YOUR_BRANCH_1
git branch -m feature/responsive-reports-activity YOUR_BRANCH_2
git branch -m feature/dashboard-charts YOUR_BRANCH_3
```

Push:

```powershell
git push -u origin YOUR_BRANCH_1
git push -u origin YOUR_BRANCH_2
git push -u origin YOUR_BRANCH_3
```

---

## Branch 1: Activity Log feature

**Purpose:** API, audit trail, Settings activity panel (table), UI event logging on key pages, settings field diff.

| Path | Notes |
|------|--------|
| `mams/shared/types/src/activity.ts` | New |
| `mams/shared/types/src/index.ts` | Export activity types |
| `mams/mams-server/src/routes/activity.routes.ts` | New |
| `mams/mams-server/src/services/activity.service.ts` | New |
| `mams/mams-server/tests/activity.test.ts` | New |
| `mams/mams-server/src/routes/index.ts` | Mount `/activity` |
| `mams/mams-server/src/routes/settings.routes.ts` | `diffSettingsValues` audits |
| `mams/mams-web/src/api/activity.ts` | New |
| `mams/mams-web/src/hooks/useActivityLog.ts` | New |
| `mams/mams-web/src/lib/activityLabels.ts` | New |
| `mams/mams-web/src/lib/format.ts` | `fmtIstDateTimeMs` |
| `mams/mams-web/src/components/activity/ActivityLogPanel.tsx` | **Table only** (no mobile cards) |
| `mams/mams-web/src/pages/Settings.tsx` | Activity section + `pickChanged` |
| `mams/mams-web/src/pages/Reports.tsx` | `useActivityLog` only (no card components) |
| `mams/mams-web/src/pages/Employees.tsx` | Search activity logging |
| `mams/mams-web/src/pages/EmployeesAddModal.tsx` | Activity on create |
| `mams/mams-web/src/pages/AttendanceLog.tsx` | Filter activity logging |
| `mams/mams-web/src/components/devices/DeviceManagementPanel.tsx` | Filter activity logging |

**Not in branch 1:** `ActivityCardList.tsx`, `components/reports/*`, dashboard/chart files, `seed.ts` dashboard demo, responsive QA checklist lines for Reports/Dashboard.

---

## Branch 2: Responsive (Reports + Activity log)

**Base:** `feature/activity-log` (must merge branch 1 first, or branch 2 targets it).

| Path | Notes |
|------|--------|
| `mams/mams-web/src/components/activity/ActivityCardList.tsx` | New |
| `mams/mams-web/src/components/activity/ActivityLogPanel.tsx` | Hybrid cards + `hidden md:block` table |
| `mams/mams-web/src/components/reports/DailyReportCardList.tsx` | New |
| `mams/mams-web/src/components/reports/MonthlyReportCardList.tsx` | New |
| `mams/mams-web/src/components/reports/DepartmentReportCardList.tsx` | New |
| `mams/mams-web/src/pages/Reports.tsx` | Card lists + responsive toolbars + print classes |
| `docs/responsive-qa-checklist.md` | **Settings** + **Reports** sections only |

---

## Branch 3: Dashboard dynamic charts

**Base:** `main` (or rebase onto `main` after 1+2 merged).

| Path | Notes |
|------|--------|
| `mams/mams-server/src/services/dashboard.service.ts` | New |
| `mams/mams-server/src/routes/dashboard.routes.ts` | `GET /charts` |
| `mams/mams-server/tests/dashboard.charts.test.ts` | New |
| `mams/mams-server/seed/seed.ts` | 7d + tomorrow, punctuality demo, bar snapshots |
| `mams/mams-web/package.json` | `chart.js`, `react-chartjs-2` |
| `mams/package-lock.json` | Lockfile |
| `mams/mams-web/src/lib/chartSetup.ts` | New |
| `mams/mams-web/src/api/dashboard.ts` | `charts` API type |
| `mams/mams-web/src/components/dashboard/DashboardCharts.tsx` | New |
| `mams/mams-web/src/pages/Dashboard.tsx` | Charts, remove old CSS week trend |
| `docs/responsive-qa-checklist.md` | **Dashboard** section only |

---

## Integration branch

`wip/integration` — full working tree (all features). Use for local dev; do not merge to `main` as-is.

---

## Re-run prepare script

From repo root (with Node on PATH):

```powershell
.\scripts\prepare-feature-branches.ps1
```

This resets the three `feature/*` branches from current `wip/integration` content.
