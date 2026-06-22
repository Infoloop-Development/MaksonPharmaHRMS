import { useCallback, useRef } from 'react';
import type { ActivityPage } from '@mams/types';
import { activityApi } from '../api/activity';

const SEARCH_DEBOUNCE_MS = 800;

export function useActivityLog() {
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logUi = useCallback(
    (eventType: string, page: ActivityPage, action: string, payload?: Record<string, unknown>) => {
      activityApi.logUi({ eventType, page, action, payload }).catch(() => {
        /* activity logging must not break UX */
      });
    },
    []
  );

  const logFilter = useCallback(
    (page: ActivityPage, action: string, payload?: Record<string, unknown>) => {
      logUi(`ui.${page}.filter`, page, action, payload);
    },
    [logUi]
  );

  const logSearch = useCallback(
    (page: ActivityPage, action: string, payload?: Record<string, unknown>) => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        logUi(`ui.${page}.search`, page, action, payload);
      }, SEARCH_DEBOUNCE_MS);
    },
    [logUi]
  );

  const logFilterDebounced = useCallback(
    (page: ActivityPage, action: string, payload?: Record<string, unknown>) => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        logUi(`ui.${page}.filter`, page, action, payload);
      }, SEARCH_DEBOUNCE_MS);
    },
    [logUi]
  );

  const logReportsAction = useCallback(
    (eventType: 'ui.reports.filter' | 'ui.reports.print' | 'ui.reports.export_csv' | 'ui.reports.export_xlsx', payload: Record<string, unknown>) => {
      logUi(eventType, 'reports', eventType.replace('ui.reports.', ''), payload);
    },
    [logUi]
  );

  const logDashboardAction = useCallback(
    (
      eventType: 'ui.dashboard.filter' | 'ui.dashboard.export_xlsx' | 'ui.dashboard.export_pdf',
      payload: Record<string, unknown>
    ) => {
      logUi(eventType, 'dashboard', eventType.replace('ui.dashboard.', ''), payload);
    },
    [logUi]
  );

  return { logFilter, logFilterDebounced, logSearch, logReportsAction, logDashboardAction, logUi };
}
