type Status = 'Active' | 'Inactive';

type Props = {
  value: Status;
  onChange: (v: Status) => void;
  error?: string;
};

export function StatusToggle({ value, onChange, error }: Props) {
  const active = value === 'Active';
  return (
    <div>
      <div className="label">Status</div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={`Status: ${value}`}
          onClick={() => onChange(active ? 'Inactive' : 'Active')}
          className={[
            'flex h-9 w-[3.25rem] shrink-0 items-center rounded-full px-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
            active ? 'justify-start bg-green' : 'justify-end bg-red',
          ].join(' ')}
        >
          <span className="h-7 w-7 rounded-full bg-white shadow-md shrink-0" />
        </button>
        <div className="flex flex-col">
          <span className={`text-sm font-semibold ${active ? 'text-green' : 'text-red'}`}>
            {active ? 'Active' : 'Inactive'}
          </span>
          <span className="text-[11px] text-text-subtle">Tap the switch to change</span>
        </div>
      </div>
      {error && <p className="mt-1 text-[11px] text-red">{error}</p>}
    </div>
  );
}
