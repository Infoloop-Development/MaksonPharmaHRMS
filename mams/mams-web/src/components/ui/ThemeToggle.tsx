import type { ThemePreference } from '@mams/types';
import type { ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';

function IconSun({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconMoon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconSystem({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

const ICON_SM = 'w-[18px] h-[18px]';

const OPTIONS: {
  value: ThemePreference;
  label: string;
  ariaLabel: string;
  icon: ReactNode;
}[] = [
  { value: 'light', label: 'Light', ariaLabel: 'Light theme', icon: <IconSun className={ICON_SM} /> },
  { value: 'dark', label: 'Dark', ariaLabel: 'Dark theme', icon: <IconMoon className={ICON_SM} /> },
  { value: 'system', label: 'System', ariaLabel: 'System theme', icon: <IconSystem className={ICON_SM} /> },
];

const THEME_ORDER: ThemePreference[] = ['light', 'dark', 'system'];

function ThemeSegmentGroup({
  compact,
  themePreference,
  setThemePreference,
  busy,
}: {
  compact: boolean;
  themePreference: ThemePreference;
  setThemePreference: (value: ThemePreference) => Promise<void>;
  busy: boolean;
}) {
  return (
    <div
      className={`theme-toggle${busy ? ' theme-toggle--busy' : ''}`}
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map((o) => {
        const active = themePreference === o.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={busy}
            className={`theme-toggle-btn${compact ? ' theme-toggle-btn--compact' : ''}${
              active ? ' theme-toggle-btn--active' : ''
            }`}
            aria-pressed={active}
            aria-label={o.ariaLabel}
            title={o.ariaLabel}
            onClick={() => void setThemePreference(o.value)}
          >
            {o.icon}
            {!compact && <span>{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Single control for narrow toolbars — cycles light → dark → system. */
function ThemeCycleButton({
  themePreference,
  setThemePreference,
  busy,
}: {
  themePreference: ThemePreference;
  setThemePreference: (value: ThemePreference) => Promise<void>;
  busy: boolean;
}) {
  const current = OPTIONS.find((o) => o.value === themePreference) ?? OPTIONS[0]!;
  const onCycle = () => {
    const idx = THEME_ORDER.indexOf(themePreference);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length]!;
    void setThemePreference(next);
  };

  return (
    <button
      type="button"
      className="app-topbar-icon-btn"
      disabled={busy}
      aria-label={`${current.ariaLabel}. Tap to change theme.`}
      title={`${current.label} theme — tap to change`}
      onClick={onCycle}
    >
      {current.icon}
    </button>
  );
}

export function ThemeToggle({
  compact = false,
  cycle = false,
}: {
  compact?: boolean;
  /** Mobile-friendly single button that cycles themes. */
  cycle?: boolean;
}) {
  const { themePreference, setThemePreference, busy } = useTheme();

  if (cycle) {
    return (
      <ThemeCycleButton
        themePreference={themePreference}
        setThemePreference={setThemePreference}
        busy={busy}
      />
    );
  }

  return (
    <ThemeSegmentGroup
      compact={compact}
      themePreference={themePreference}
      setThemePreference={setThemePreference}
      busy={busy}
    />
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
