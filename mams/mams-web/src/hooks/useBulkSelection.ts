import { useCallback, useMemo, useState } from 'react';
import { BULK_SELECTION_MAX } from '@mams/types';

export function useBulkSelection() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids.slice(0, BULK_SELECTION_MAX)));
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const count = selected.size;
  const ids = useMemo(() => [...selected], [selected]);
  const overLimit = count > BULK_SELECTION_MAX;

  const pageSelectionState = useCallback(
    (pageIds: string[]) => {
      if (pageIds.length === 0) return { allSelected: false, someSelected: false };
      const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
      return {
        allSelected: selectedOnPage === pageIds.length,
        someSelected: selectedOnPage > 0 && selectedOnPage < pageIds.length,
      };
    },
    [selected]
  );

  const togglePage = useCallback((pageIds: string[]) => {
    const { allSelected } = pageSelectionState(pageIds);
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [pageSelectionState]);

  return {
    selected,
    ids,
    count,
    overLimit,
    isSelected,
    toggle,
    selectAll,
    clear,
    pageSelectionState,
    togglePage,
  };
}
