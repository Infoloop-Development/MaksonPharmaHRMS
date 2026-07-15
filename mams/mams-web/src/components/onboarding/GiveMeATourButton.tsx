import { useAuth } from '../../store/auth';

export function GiveMeATourButton({ onClick }: { onClick: () => void }) {
  const viewMode = useAuth((s) => s.user?.viewMode);
  if (viewMode === 'compliant') return null;

  return (
    <button
      type="button"
      className="btn-outline h-10 min-h-10 shrink-0 whitespace-nowrap"
      aria-label="Give me a tour of this page"
      onClick={onClick}
    >
      Give me a tour
    </button>
  );
}
