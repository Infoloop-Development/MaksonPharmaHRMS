import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { UserSummary } from '../../api/users';

export function SearchableUserSelect({
  value,
  onChange,
  users,
  disabled,
  placeholder = 'All users',
}: {
  value: string;
  onChange: (userId: string) => void;
  users: UserSummary[] | undefined;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selected = users?.find((u) => u._id === value);

  const filtered = useMemo(() => {
    const list = users ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

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
    searchRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const select = (userId: string) => {
    onChange(userId);
    setQuery('');
    setOpen(false);
  };

  const triggerLabel = selected ? `${selected.name} (${selected.email})` : placeholder;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className="input w-full text-left flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="flex-1 truncate">{triggerLabel}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full min-w-0 max-w-[calc(100vw-2rem)] sm:min-w-[280px] rounded-md border border-border bg-surface shadow-floating overflow-hidden">
          <div className="p-2 border-b border-border bg-surface2">
            <input
              ref={searchRef}
              type="search"
              className="input w-full text-sm"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search users"
            />
          </div>
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Users"
            className="max-h-60 overflow-y-auto py-1"
          >
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={!value}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-surface2 transition-colors ${
                  !value ? 'bg-primary-bg text-primary-on-bg font-semibold' : 'text-text'
                }`}
                onClick={() => select('')}
              >
                {placeholder}
              </button>
            </li>
            {filtered.map((u) => (
              <li key={u._id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === u._id}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-surface2 transition-colors ${
                    value === u._id ? 'bg-primary-bg text-primary-on-bg font-semibold' : 'text-text'
                  }`}
                  onClick={() => select(u._id)}
                >
                  <span className="block truncate font-medium">{u.name}</span>
                  <span className="block truncate text-xs text-text-muted">{u.email}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-sm text-text-muted text-center">No users match your search.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
