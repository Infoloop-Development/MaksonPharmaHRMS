import { useState, type ReactNode } from 'react';

function readCollapsed(storageKey: string, defaultCollapsed: boolean): boolean {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw == null) return defaultCollapsed;
    return raw === '1';
  } catch {
    return defaultCollapsed;
  }
}

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={up ? 'rotate-180' : ''}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/**
 * Reference/informational box that collapses to a single-line title bar instead of
 * fully dismissing. State persists per browser (localStorage), but is always
 * recoverable with one click - unlike a hard "dismiss forever" pattern.
 */
export function CollapsibleInfoBox({
  storageKey,
  title,
  defaultCollapsed = false,
  children,
}: {
  storageKey: string;
  title: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(storageKey, defaultCollapsed));

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(storageKey, next ? '1' : '0');
    } catch {
      // localStorage unavailable - collapsed state just won't persist across sessions.
    }
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between rounded-md border border-primary/20 bg-primary-bg px-4 py-2 text-sm mb-4 hover:bg-primary-bg/70 transition-colors"
      >
        <span className="font-semibold text-text">{title}</span>
        <span className="text-text-muted shrink-0">
          <ChevronIcon up={false} />
        </span>
      </button>
    );
  }

  return (
    <div className="relative rounded-md border border-primary/20 bg-primary-bg p-4 pr-10 text-sm mb-4">
      <button
        type="button"
        onClick={toggle}
        className="absolute top-2 right-2 w-7 h-7 rounded-md hover:bg-primary/10 text-text-muted flex items-center justify-center shrink-0"
        aria-label="Collapse"
      >
        <ChevronIcon up={true} />
      </button>
      <div className="font-semibold text-text mb-1">{title}</div>
      {children}
    </div>
  );
}
