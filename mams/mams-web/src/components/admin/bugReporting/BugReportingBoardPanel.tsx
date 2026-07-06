import { Link } from 'react-router-dom';
import type { BugReportListResponse } from '@mams/types';
import type { BugPhase } from './useBugReportingBoard';
import { BugReportKanbanBoard } from './BugReportKanbanBoard';

type FilterProps = {
  search: string;
  onSearchChange: (v: string) => void;
  module: string;
  onModuleChange: (v: string) => void;
  modules: string[];
  severity: string;
  onSeverityChange: (v: string) => void;
  severityLabels: Record<string, string>;
  assigneeId: string;
  onAssigneeIdChange: (v: string) => void;
  assigneeOptions: Array<{ _id: string; name: string }>;
  unassignedValue: string;
  compact?: boolean;
};

export function BugReportingFilters({
  search,
  onSearchChange,
  module,
  onModuleChange,
  modules,
  severity,
  onSeverityChange,
  severityLabels,
  assigneeId,
  onAssigneeIdChange,
  assigneeOptions,
  unassignedValue,
  compact = false,
}: FilterProps) {
  const fieldClass = compact
    ? 'grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 shrink-0'
    : 'card p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3';
  const labelClass = compact
    ? 'text-[10px] font-semibold text-text-muted block mb-0.5'
    : 'text-xs font-semibold text-text-muted block mb-1';

  return (
    <div className={fieldClass}>
      <div>
        <label className={labelClass}>Search title</label>
        <input
          type="search"
          className="input w-full h-9 text-sm"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search…"
        />
      </div>
      <div>
        <label className={labelClass}>Module</label>
        <select
          className="input w-full h-9 text-sm"
          value={module}
          onChange={(e) => onModuleChange(e.target.value)}
        >
          <option value="">All modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Severity</label>
        <select
          className="input w-full h-9 text-sm"
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value)}
        >
          <option value="">All severities</option>
          {Object.keys(severityLabels).map((s) => (
            <option key={s} value={s}>
              {severityLabels[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Assignee</label>
        <select
          className="input w-full h-9 text-sm"
          value={assigneeId}
          onChange={(e) => onAssigneeIdChange(e.target.value)}
        >
          <option value="">All assignees</option>
          <option value={unassignedValue}>Unassigned</option>
          {assigneeOptions.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

type BoardPanelProps = {
  variant?: 'default' | 'expanded';
  chromeless?: boolean;
  phases: BugPhase[];
  phasesLoading: boolean;
  columns: Record<string, BugReportListResponse | undefined>;
  loadingByPhaseId: Record<string, boolean>;
  onOpen: (id: string) => void;
  onMove: (reportId: string, fromPhaseId: string, toPhaseId: string, phaseLabel: string) => void;
  showSettingsLink?: boolean;
  showFullscreenLink?: boolean;
  filtersSlot?: React.ReactNode;
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
}: BoardPanelProps) {
  const expanded = variant === 'expanded' || chromeless;

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
            <Link to="/admin/bug-reporting" className="btn-outline btn-sm">
              ← Compact view
            </Link>
            <Link to="/admin/bug-reporting/settings" className="btn-outline btn-sm" title="Phase settings">
              ⚙
            </Link>
          </div>
        </div>
      )}

      {filtersSlot}

      {phasesLoading && phases.length === 0 ? (
        <p className="text-text-muted text-sm">Loading phases…</p>
      ) : (
        <div className={chromeless ? 'flex-1 min-h-0' : undefined}>
          <BugReportKanbanBoard
            phases={phases}
            columns={columns}
            loadingByPhaseId={loadingByPhaseId}
            onOpen={onOpen}
            onMove={onMove}
            expanded={expanded}
          />
        </div>
      )}
    </>
  );

  if (chromeless) {
    return <div className="flex flex-1 min-h-0 flex-col">{content}</div>;
  }
  return content;
}
