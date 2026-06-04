# MAMS responsive QA checklist

Manual verification after responsive layout changes. Use browser DevTools device mode or real devices.

## Breakpoints (Tailwind)

| Token | Min width | Typical devices |
|-------|-----------|-----------------|
| default | 0 | Mobile phones |
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets portrait |
| `lg` | 1024px | Tablets landscape, small laptops |
| `xl` | 1280px | 13–14" laptops |
| `2xl` | 1536px | 15"+ displays |

## Test matrix

| Viewport | Size | Pass? | Notes |
|----------|------|-------|-------|
| iPhone SE | 375×667 | | Login, hamburger opens drawer, Employees cards |
| iPhone 14 | 390×844 | | Devices cards, Attendance cards, Settings scroll |
| iPad portrait | 768×1024 | | Tables visible (md+), filters wrap |
| iPad landscape | 1024×768 | | Sidebar fixed (lg+), reduced table columns |
| 13" laptop | 1280×800 | | No full-page horizontal scroll; Devices table usable |
| 14" | 1366×768 | | Employees table, Dashboard 2×2 stats |
| 15" / desktop | 1920×1080 | | Full columns, sidebar always visible |

## Dashboard

- [ ] Chart.js bar + pie load after `npm run seed` (non-zero data)
- [ ] Charts stack below `lg`; side by side at `lg+`
- [ ] Pie color legend readable at 375px width
- [ ] Bar chart: total employees vs present for last 5 IST dates

## Global shell

- [ ] Hamburger visible below `lg`; opens/closes sidebar overlay
- [ ] Tap backdrop closes menu
- [ ] Navigating to a route closes mobile drawer
- [ ] Sidebar always visible at `lg` and above
- [ ] Top bar shows short view badge (`REAL` / `COMPLIANT`) on small screens; full text from `sm`
- [ ] Main content has no horizontal page scroll (only intentional table scroll areas)

## Pages

### Dashboard
- [ ] Stat cards: 1 col mobile → 2 col `sm` → 4 col `xl`
- [ ] Week trend bars stack on mobile

### Employees
- [ ] Card list below `md`
- [ ] Table from `md`; Joined/Comp columns from `xl`

### Attendance Log
- [ ] Punch cards below `md`
- [ ] Table from `md`; Department column from `lg`

### Devices (biometric)
- [ ] Device cards below `md`
- [ ] Filter grid stacks on small screens
- [ ] Go-live orphan cards on mobile

### Reports
- [ ] Tab buttons wrap
- [ ] Filter bar stacks (`FilterBar` grid)
- [ ] Daily / Monthly / Department: cards below `md`, table from `md`
- [ ] Location tab: card grid (unchanged)
- [ ] Daily print from mobile: table visible (`print:block`), cards hidden (`print:hidden`)
- [ ] Daily/monthly tables use `.tbl-scroll`; fewer columns below `xl` on desktop

### Settings
- [ ] Activity log: cards below `md`, table from `md`

### Adjustments
- [ ] Status stat grid 2×2 then 4 columns
- [ ] Create/detail modals: form fields stack on mobile

### Modals
- [ ] Footer buttons full-width stacked on mobile
- [ ] Content scrolls inside `max-h-[90vh]`

### Login / change password
- [ ] Card fits viewport with `p-6` on mobile

## Regression (desktop)

- [ ] Print on Reports still hides chrome (`no-print`)
- [ ] All existing flows: login, employee detail, device register, CSV import

## Sign-off

| Tester | Date | Build / commit |
|--------|------|----------------|
| | | |
