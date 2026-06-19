import { useRef } from 'react';

export function ColorSwatchPicker({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (hex: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const swatches = options.slice(0, 3);

  return (
    <div>
      <div className="text-xs font-bold uppercase text-text-muted mb-2">{label}</div>
      <div className="flex items-center gap-2 flex-wrap">
        {swatches.map((hex, i) => {
          const selected = hex.toUpperCase() === value.toUpperCase();
          return (
            <button
              key={`${hex}-${i}`}
              type="button"
              disabled={disabled}
              title={hex}
              aria-label={`${label} option ${i + 1}: ${hex}`}
              className={`w-9 h-9 rounded-full border-2 transition shrink-0 ${
                selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40'
              }`}
              style={{ backgroundColor: hex }}
              onClick={() => onChange(hex.toUpperCase())}
            />
          );
        })}
        <button
          type="button"
          disabled={disabled}
          title="Custom color"
          aria-label={`Custom ${label.toLowerCase()}`}
          className="w-9 h-9 rounded-full border-2 border-border shrink-0 overflow-hidden relative hover:border-primary/40"
          style={{
            background: 'conic-gradient(from 180deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
          }}
          onClick={() => inputRef.current?.click()}
        >
          <span className="absolute inset-[3px] rounded-full bg-surface flex items-center justify-center text-[10px] font-bold text-text-muted">
            +
          </span>
        </button>
        <input
          ref={inputRef}
          type="color"
          className="sr-only"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
        <code className="text-[11px] font-mono text-text-muted ml-1">{value}</code>
      </div>
    </div>
  );
}
