import { useEffect, useId, useRef, useState } from 'react';
import { ORG_BRAND_FONT_FAMILIES, type OrgBrandFontFamily } from '@mams/types';
import { fontFamilyStack } from '../../lib/orgBrandingTheme';

export function FontFamilyPicker({
  value,
  onChange,
  disabled,
}: {
  value: OrgBrandFontFamily;
  onChange: (font: OrgBrandFontFamily) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const select = (font: OrgBrandFontFamily) => {
    onChange(font);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className="w-full px-3 py-2 border border-border rounded-md text-[15px] bg-surface2 text-text focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="flex-1 text-left truncate" style={{ fontFamily: fontFamilyStack(value) }}>
          {value}
        </span>
        <span className="text-text-muted text-xs shrink-0" aria-hidden>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Font family"
          className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-surface shadow-floating py-1"
        >
          {ORG_BRAND_FONT_FAMILIES.map((font) => {
            const selected = font === value;
            return (
              <li key={font} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`w-full px-3 py-2.5 flex items-center gap-2 text-left transition hover:bg-surface2 ${
                    selected ? 'bg-surface2' : ''
                  }`}
                  onClick={() => select(font)}
                >
                  <span className="w-5 shrink-0 text-primary text-sm font-bold" aria-hidden>
                    {selected ? '✓' : ''}
                  </span>
                  <span className="flex-1 truncate text-[15px]" style={{ fontFamily: fontFamilyStack(font) }}>
                    {font}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
