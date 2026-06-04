import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { fmtDate } from '../../lib/format';
import 'react-day-picker/style.css';

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (yyyyMmDd: string) => void;
  error?: string;
  hint?: string;
};

export function DateField({ id, label, value, onChange, error, hint }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const selected = value ? parseISO(`${value}T12:00:00`) : undefined;
  const display = value ? fmtDate(value) : 'Select date';

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor={id} className="label">{label}</label>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={[
          'input w-full text-left flex items-center justify-between gap-2',
          error ? 'ring-1 ring-red' : '',
          !value ? 'text-text-subtle' : 'text-text',
        ].join(' ')}
      >
        <span className="font-mono text-sm">{display}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>
      {hint && !error && <p className="mt-1 text-[11px] text-text-subtle">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-red">{error}</p>}

      {open && (
        <div
          className="absolute z-[60] mt-1 rounded-lg border border-border bg-white p-3 shadow-floating mams-day-picker"
          style={
            {
              '--rdp-accent-color': '#1A2878',
              '--rdp-accent-background-color': '#E8EAF5',
            } as CSSProperties
          }
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, 'yyyy-MM-dd'));
                setOpen(false);
              }
            }}
            showOutsideDays
          />
        </div>
      )}
    </div>
  );
}
