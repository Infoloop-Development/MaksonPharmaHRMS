export function TablePagination({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
  showTotal = false,
}: {
  page: number;
  totalPages: number;
  total?: number;
  onPrev: () => void;
  onNext: () => void;
  showTotal?: boolean;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <div className="text-text-muted">
        Page {page} of {totalPages}
        {showTotal && total != null ? ` · ${total} records` : ''}
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={onPrev}>
          Previous
        </button>
        <button type="button" className="btn-outline btn-sm" disabled={page >= totalPages} onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
}
