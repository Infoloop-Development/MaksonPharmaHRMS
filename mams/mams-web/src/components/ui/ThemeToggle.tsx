import type { ThemePreference } from '@mams/types';
import { useTheme } from '../../hooks/useTheme';

const OPTIONS: { value: ThemePreference; label: string; short: string }[] = [
  { value: 'light', label: 'Light', short: 'Light' },
  { value: 'dark', label: 'Dark', short: 'Dark' },
  { value: 'system', label: 'System', short: 'Auto' },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { themePreference, setThemePreference, busy } = useTheme();

  if (compact) {
    return (
      <select
        className="input !py-1.5 !px-2 !min-h-0 !w-auto text-xs bg-surface2"
        value={themePreference}
        disabled={busy}
        onChange={(e) => void setThemePreference(e.target.value as ThemePreference)}
        aria-label="Theme"
        title="Appearance"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.short}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="inline-flex rounded-md border border-border bg-surface2 p-0.5" role="group" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={busy}
          className={`px-2.5 py-1.5 text-xs font-semibold rounded transition-colors ${
            themePreference === o.value
              ? 'bg-primary-bg text-primary-on-bg shadow-sm'
              : 'text-text-muted hover:text-text'
          }`}
          onClick={() => void setThemePreference(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AppearanceSection() {
  return (
    <div className="card p-5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-text">Appearance</h3>
        <p className="text-xs text-text-muted mt-1">
          Choose light, dark, or match your device. Your preference is saved to your account.
        </p>
      </div>
      <ThemeToggle />
    </div>
  );
}
