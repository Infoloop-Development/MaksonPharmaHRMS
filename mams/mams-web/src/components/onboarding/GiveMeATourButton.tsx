export function GiveMeATourButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="btn-outline btn-sm shrink-0"
      aria-label="Give me a tour of this page"
      onClick={onClick}
    >
      Give me a tour
    </button>
  );
}
