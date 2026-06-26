import { useState } from 'react';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    id: 'employees',
    title: '1. Load employees with Biometric ID',
    body: 'Import CSV or add manually. biometricId must match the ID IT will use on each device.',
    link: { to: '/employees', label: 'Employees' },
  },
  {
    id: 'enroll',
    title: '2. Enroll fingerprints on hardware (IT)',
    body: 'Use vendor software on each machine. MAMS does not enroll biometrics in the web app.',
  },
  {
    id: 'register',
    title: '3. Register devices in MAMS',
    body: 'Devices page: register each unit, then configure server URL / push token on the physical unit.',
    link: { to: '/devices', label: 'Devices' },
  },
  {
    id: 'pilot',
    title: '4. Pilot punch test',
    body: 'One known employee punches → Attendance Log row + device status Live. Fix unmapped IDs if needed.',
    link: { to: '/attendance', label: 'Attendance Log' },
  },
] as const;

export function GoLiveChecklist() {
  const [open, setOpen] = useState(true);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  return (
    <div className="rounded-md border border-border bg-surface2/30 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold hover:bg-surface2/50"
        onClick={() => setOpen((o) => !o)}
      >
        <span>Go-live checklist</span>
        <span className="text-text-muted text-xs font-normal">
          {Object.values(checked).filter(Boolean).length}/{STEPS.length} done
        </span>
      </button>
      {open && (
        <ol className="px-4 pb-4 space-y-3 border-t border-border">
          {STEPS.map((step) => (
            <li key={step.id} className="flex gap-3 text-sm pt-3 first:pt-3">
              <input
                type="checkbox"
                className="mt-1 shrink-0"
                checked={!!checked[step.id]}
                onChange={() => toggle(step.id)}
                aria-label={`Mark ${step.title} complete`}
              />
              <div>
                <div className="font-medium text-text">{step.title}</div>
                <p className="text-xs text-text-muted mt-0.5">{step.body}</p>
                {'link' in step && step.link && (
                  <Link to={step.link.to} className="text-xs text-link font-semibold hover:underline mt-1 inline-block">
                    Open {step.link.label} →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
