import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { BugReportListResponse } from '@mams/types';
import type { BugPhase } from './useBugReportingBoard';
import type { BugShareVariant } from '../../../lib/bugReport/bugShareUrl';
import { BugReportKanbanBoard } from './BugReportKanbanBoard';
import { BugReportExportModal } from './BugReportExportModal';
import { BugReportStatsModal } from './BugReportStatsModal';

export { BugReportingFilterPanel, BugReportingFilters } from './BugReportingFilterPanel';

type BoardPanelProps = {
  variant?: 'default' | 'expanded';
  chromeless?: boolean;
  phases: BugPhase[];
  phasesLoading: boolean;
  columns: Record<string, BugReportListResponse | undefined>;
  loadingByPhaseId: Record<string, boolean>;
  onOpen: (id: string, publicId?: string) => void;
  onMove: (reportId: string, fromPhaseId: string, toPhaseId: string, phaseLabel: string) => void;
  showSettingsLink?: boolean;
  showFullscreenLink?: boolean;
  filtersSlot?: React.ReactNode;
  shareVariant?: BugShareVariant;
};

export function BugReportingBoardPanel({
  variant = 'default',
  chromeless = false,
  phases,
  phasesLoading,
  columns,
  loadingByPhaseId,
  onOpen,
  onMove,
  showSettingsLink = true,
  showFullscreenLink = true,
  filtersSlot,
  shareVariant = 'default',
}: BoardPanelProps) {
  const expanded = variant === 'expanded' || chromeless;
  const [reportOpen, setReportOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  const statsButton = (
    <button
      type="button"
      className="btn-outline btn-sm"
      title="Bug reporting statistics"
      aria-label="Bug reporting statistics"
      onClick={() => setStatsOpen(true)}
    >
      📈 Stats
    </button>
  );

  const reportButton = (
    <button
      type="button"
      className="btn-outline btn-sm"
      title="Bug report export"
      aria-label="Bug report export"
      onClick={() => setReportOpen(true)}
    >
      📊 Report
    </button>
  );

  const content = (
    <>
      {!chromeless && !expanded && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Bug reporting</h1>
            <p className="text-sm text-text-muted mt-1">
              Drag cards between columns to update phase. IT Admin only.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {statsButton}
            {reportButton}
            {showSettingsLink && (
              <Link
                to="/admin/bug-reporting/settings"
                className="btn-outline btn-sm"
                title="Phase settings"
                aria-label="Phase settings"
              >
                ⚙ Settings
              </Link>
            )}
            {showFullscreenLink && (
              <button
                type="button"
                className="btn-outline btn-sm"
                title="Open fullscreen board"
                aria-label="Open fullscreen board"
                onClick={() => window.open('/admin/bug-reporting/board', '_blank')}
              >
                ⛶ Fullscreen
              </button>
            )}
          </div>
        </div>
      )}

      {!chromeless && expanded && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold">Bug board</h1>
          <div className="flex items-center gap-2">
            {statsButton}
            {reportButton}
            <Link to="/admin/bug-reporting" className="btn-outline btn-sm">
              ← Compact view
            </Link>
            <Link to="/admin/bug-reporting/settings" className="btn-outline btn-sm" title="Phase settings">
              ⚙
            </Link>
          </div>
        </div>
      )}

      {chromeless && (
        <div className="mb-2 flex justify-end gap-2 shrink-0">
          {statsButton}
          {reportButton}
        </div>
      )}

      {filtersSlot}

      {phasesLoading && phases.length === 0 ? (
        <p className="text-text-muted text-sm">Loading phases…</p>
      ) : (
        <div className={chromeless ? 'flex-1 min-h-0 min-w-0' : 'min-w-0'}>
          <BugReportKanbanBoard
            phases={phases}
            columns={columns}
            loadingByPhaseId={loadingByPhaseId}
            onOpen={onOpen}
            onMove={onMove}
            expanded={expanded}
            shareVariant={shareVariant}
          />
        </div>
      )}
    </>
  );

  const panel = (
    <>
      {content}
      <BugReportExportModal open={reportOpen} onClose={() => setReportOpen(false)} />
      <BugReportStatsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
    </>
  );

  if (chromeless) {
    return <div className="flex flex-1 min-h-0 flex-col">{panel}</div>;
  }
  return panel;
}
