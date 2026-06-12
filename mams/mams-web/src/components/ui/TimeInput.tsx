import { useMemo } from 'react';
import { Input, Select } from './Field';
import { useTimeDisplay } from '../../store/timeFormat';
import { composeHhmmFrom12h, splitHhmmTo12h } from '../../lib/timeFormat';

type TimeInputProps = {
  value: string;
  onChange: (hhmm: string) => void;
  disabled?: boolean;
  className?: string;
};

export function TimeInput({ value, onChange, disabled, className }: TimeInputProps) {
  const { format } = useTimeDisplay();

  if (format === '24h') {
    return (
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={className}
      />
    );
  }

  return <TimeInput12h value={value} onChange={onChange} disabled={disabled} className={className} />;
}

function TimeInput12h({ value, onChange, disabled, className }: TimeInputProps) {
  const parts = useMemo(() => splitHhmmTo12h(value) ?? { hour12: 12, minute: 0, period: 'AM' as const }, [value]);

  const update = (patch: Partial<{ hour12: number; minute: number; period: 'AM' | 'PM' }>) => {
    const next = { ...parts, ...patch };
    const hhmm = composeHhmmFrom12h(next.hour12, next.minute, next.period);
    if (hhmm) onChange(hhmm);
  };

  return (
    <div className={`flex gap-2 items-center ${className ?? ''}`}>
      <Select
        value={String(parts.hour12)}
        onChange={(e) => update({ hour12: Number(e.target.value) })}
        disabled={disabled}
        className="flex-1 min-w-0"
        aria-label="Hour"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </Select>
      <span className="text-text-muted shrink-0">:</span>
      <Select
        value={String(parts.minute).padStart(2, '0')}
        onChange={(e) => update({ minute: Number(e.target.value) })}
        disabled={disabled}
        className="flex-1 min-w-0"
        aria-label="Minute"
      >
        {Array.from({ length: 60 }, (_, i) => i).map((m) => (
          <option key={m} value={String(m).padStart(2, '0')}>
            {String(m).padStart(2, '0')}
          </option>
        ))}
      </Select>
      <Select
        value={parts.period}
        onChange={(e) => update({ period: e.target.value as 'AM' | 'PM' })}
        disabled={disabled}
        className="w-20 shrink-0"
        aria-label="AM or PM"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </Select>
    </div>
  );
}
