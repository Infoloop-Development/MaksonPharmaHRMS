import type { ReactNode } from 'react';

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  children: ReactNode;
  hint?: string;
};

export function SelectField({ id, label, value, onChange, error, children, hint }: Props) {
  const err = Boolean(error);
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={[
            'input w-full appearance-none cursor-pointer pr-10',
            err ? 'ring-1 ring-red border-red' : '',
          ].join(' ')}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>
      {hint && !error && <p className="mt-1 text-[11px] text-text-subtle">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-red">{error}</p>}
    </div>
  );
}
