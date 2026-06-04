type Tone = 'green' | 'red' | 'amber' | 'blue' | 'gray';

const TONE_MAP: Record<Tone, string> = {
  green: 'bg-green-bg text-green-dark',
  red: 'bg-red-bg text-red',
  amber: 'bg-amber-bg text-amber',
  blue: 'bg-primary-bg text-primary',
  gray: 'bg-surface2 text-text-muted',
};

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${TONE_MAP[tone]}`}>
      {children}
    </span>
  );
}
