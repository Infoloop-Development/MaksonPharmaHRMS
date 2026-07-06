import { useCallback, useEffect, useRef, useState } from 'react';

type MentionUser = { id: string; name: string };

type Props = {
  value: string;
  onChange: (value: string, mentionUserIds: string[]) => void;
  users: MentionUser[];
  placeholder?: string;
  disabled?: boolean;
  embedded?: boolean;
  onSubmit?: () => void;
};

function parseMentions(text: string, users: MentionUser[]): string[] {
  const byName = new Map(users.map((u) => [u.name.toLowerCase(), u.id]));
  const ids = new Set<string>();
  const re = /@([A-Za-z][A-Za-z0-9 ]{0,60})/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const name = match[1]?.trim().toLowerCase();
    if (!name) continue;
    const id = byName.get(name);
    if (id) ids.add(id);
  }
  return [...ids];
}

export function MentionTextarea({
  value,
  onChange,
  users,
  placeholder,
  disabled,
  embedded = false,
  onSubmit,
}: Props) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = users
    .filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  const emit = useCallback(
    (next: string) => {
      onChange(next, parseMentions(next, users));
    },
    [onChange, users]
  );

  const insertMention = (user: MentionUser) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const before = value.slice(0, start);
    const atIndex = before.lastIndexOf('@');
    const prefix = atIndex >= 0 ? value.slice(0, atIndex) : value;
    const suffix = value.slice(start);
    const mention = `@${user.name} `;
    const next = `${prefix}${mention}${suffix}`;
    emit(next);
    setShowSuggestions(false);
    setQuery('');
    requestAnimationFrame(() => {
      const pos = prefix.length + mention.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const pick = suggestions[highlight];
        if (pick) insertMention(pick);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && onSubmit && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    emit(next);
    const cursor = e.target.selectionStart;
    const before = next.slice(0, cursor);
    const atIndex = before.lastIndexOf('@');
    if (atIndex >= 0) {
      const fragment = before.slice(atIndex + 1);
      if (!fragment.includes(' ') && fragment.length <= 60) {
        setQuery(fragment);
        setShowSuggestions(true);
        setHighlight(0);
        return;
      }
    }
    setShowSuggestions(false);
    setQuery('');
  };

  useEffect(() => {
    if (!showSuggestions) setHighlight(0);
  }, [showSuggestions, query]);

  const textareaClass = embedded
    ? 'w-full min-h-[72px] max-h-36 resize-none border-0 bg-transparent px-3 pt-3 pb-1 text-sm outline-none focus:ring-0 placeholder:text-text-muted'
    : 'input w-full min-h-[88px] resize-y text-sm';

  return (
    <div className="relative flex-1 min-w-0">
      <textarea
        ref={textareaRef}
        className={textareaClass}
        value={value}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? 'Write a comment… Use @ to mention IT Admins'}
        disabled={disabled}
        rows={embedded ? 3 : undefined}
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 bottom-full mb-1 max-h-40 overflow-y-auto rounded-md border border-border bg-surface shadow-floating text-sm">
          {suggestions.map((u, i) => (
            <li key={u.id}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 hover:bg-surface2 ${i === highlight ? 'bg-surface2' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(u);
                }}
              >
                @{u.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
