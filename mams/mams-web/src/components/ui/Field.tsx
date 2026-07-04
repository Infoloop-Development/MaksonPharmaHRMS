import React, { type ReactNode } from 'react';
import { InfoTip } from './Tooltip';

interface FieldProps {
  label: string;
  hint?: string;
  labelTooltip?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, hint, labelTooltip, error, required, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
        <span className="inline-flex items-center gap-1">
          {label}
          {required && <span className="text-red ml-0.5">*</span>}
          {labelTooltip ? <InfoTip content={labelTooltip} label={`About ${label}`} /> : null}
        </span>
      </label>
      {children}
      {hint && !error && <div className="text-[11px] text-text-muted mt-1">{hint}</div>}
      {error && <div className="text-[11px] text-red mt-1">{error}</div>}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={`w-full px-3 py-2 border border-border rounded-md text-sm bg-surface2 focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition ${props.className ?? ''}`}
      />
    );
  }
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea(props, ref) {
    return (
      <textarea
        ref={ref}
        {...props}
        className={`w-full px-3 py-2 border border-border rounded-md text-sm bg-surface2 focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition resize-y min-h-[80px] ${props.className ?? ''}`}
      />
    );
  }
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ children, className, ...props }, ref) {
    return (
      <div className={`relative${className ? ` ${className}` : ''}`}>
        <select
          ref={ref}
          {...props}
          className="w-full appearance-none px-3 py-2 pr-8 border border-border rounded-md text-sm bg-surface2 focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
        >
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-text-muted">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </div>
    );
  }
);

export function Toggle({
  checked,
  onChange,
  label,
  ariaLabel,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-center gap-2 group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`toggle-track w-10 h-6 rounded-full relative shrink-0 transition-colors ${
          checked ? 'toggle-track--on' : 'toggle-track--off'
        }`}
      >
        <span
          className={`toggle-knob absolute top-0.5 w-5 h-5 rounded-full transition-all ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
      {label && <span className="text-sm text-text">{label}</span>}
    </button>
  );
}
