type Props = {
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

export function BugReportingFilterPanel({
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
}: Props) {
  const gridClass = compact
    ? 'grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 shrink-0'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4';
  const labelClass = compact
    ? 'text-[10px] font-semibold text-text-muted block mb-0.5'
    : 'text-xs font-semibold text-text-muted block mb-1';

  return (
    <div className={compact ? 'mb-2 shrink-0' : 'mb-4'}>
      <div className={gridClass}>
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
    </div>
  );
}

/** @deprecated Use BugReportingFilterPanel */
export function BugReportingFilters(props: Props) {
  return <BugReportingFilterPanel {...props} />;
}
