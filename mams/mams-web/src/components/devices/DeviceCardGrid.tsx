import { Badge } from '../ui/Badge';
import { BulkSelectCheckbox } from '../ui/BulkSelectCheckbox';
import { useTimeDisplay } from '../../store/timeFormat';
import { EMPTY_CELL } from '../../lib/format';
import type { Device } from '../../api/devices';
import {
  getDeviceConnectionState,
  CONNECTION_STATE_LABELS,
  connectionStateBadgeTone,
} from './deviceConnectionState';

function DeviceCard({
  d,
  canManage,
  selectable,
  isSelected,
  onToggleSelect,
  syncing,
  onSync,
  onTest,
  onEdit,
  onDelete,
}: {
  d: Device;
  canManage: boolean;
  selectable?: boolean;
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string) => void;
  syncing: Record<string, boolean>;
  onSync: (id: string) => void;
  onTest: (id: string) => void;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
}) {
  const { fmtTime } = useTimeDisplay();
  const connState = getDeviceConnectionState(d);

  return (
    <div className="card p-5 flex flex-col h-full">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex items-start gap-3">
          {selectable && isSelected && onToggleSelect && (
            <BulkSelectCheckbox
              checked={isSelected(d._id)}
              onChange={() => onToggleSelect(d._id)}
              ariaLabel={`Select ${d.name}`}
            />
          )}
          <div className="min-w-0">
            <div className="font-bold text-[15px] truncate">{d.name}</div>
            <div className="font-mono text-xs text-text-muted mt-0.5">{d.deviceCode}</div>
          </div>
        </div>
        <div className="shrink-0">
          <Badge tone={connectionStateBadgeTone(connState)}>
            {CONNECTION_STATE_LABELS[connState]}
          </Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs flex-1">
        <div>
          <dt className="text-text-subtle uppercase tracking-wider">Vendor</dt>
          <dd><Badge tone="blue">{d.vendor ?? 'eSSL'}</Badge></dd>
        </div>
        <div>
          <dt className="text-text-subtle uppercase tracking-wider">Network</dt>
          <dd>
            <Badge tone={d.isOnline ? 'green' : 'red'}>{d.isOnline ? 'ONLINE' : 'OFFLINE'}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-text-subtle uppercase tracking-wider">Protocol</dt>
          <dd className="uppercase">{d.protocolMode ?? 'push'}</dd>
        </div>
        <div>
          <dt className="text-text-subtle uppercase tracking-wider">Department</dt>
          <dd>{d.department ?? EMPTY_CELL}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-text-subtle uppercase tracking-wider">Location</dt>
          <dd className="text-text-muted">{d.location}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-text-subtle uppercase tracking-wider">Serial</dt>
          <dd className="font-mono">{d.serialNumber}</dd>
        </div>
        {d.ipAddress && (
          <div className="col-span-2">
            <dt className="text-text-subtle uppercase tracking-wider">IP address</dt>
            <dd className="font-mono text-text-muted">{d.ipAddress}</dd>
          </div>
        )}
        <div>
          <dt className="text-text-subtle uppercase tracking-wider">Last ping</dt>
          <dd className="font-mono">{d.lastPingAt ? fmtTime(d.lastPingAt) : EMPTY_CELL}</dd>
        </div>
        <div>
          <dt className="text-text-subtle uppercase tracking-wider">24h punches</dt>
          <dd className="font-mono">{d.recentPunchCount}</dd>
        </div>
        {d.lastSyncAt && (
          <div className="col-span-2">
            <dt className="text-text-subtle uppercase tracking-wider">Last sync</dt>
            <dd className={d.lastSyncStatus === 'error' ? 'text-red' : 'text-text-muted'}>
              {fmtTime(d.lastSyncAt)}
              {d.lastSyncStatus === 'error' && d.lastSyncError && (
                <span className="block text-red text-[11px] mt-0.5 truncate" title={d.lastSyncError}>
                  {d.lastSyncError}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>

      {canManage && (
        <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-border">
          <div className="flex gap-2">
            <button type="button" className="btn-outline flex-1 min-h-[40px] text-xs" onClick={() => onTest(d._id)}>
              Test
            </button>
            <button
              type="button"
              className="btn-outline flex-1 min-h-[40px] text-xs"
              onClick={() => onSync(d._id)}
              disabled={!!syncing[d._id]}
            >
              {syncing[d._id] ? '…' : 'Sync'}
            </button>
            <button type="button" className="btn-outline flex-1 min-h-[40px] text-xs" onClick={() => onEdit(d)}>
              Edit
            </button>
          </div>
          <button
            type="button"
            className="btn-outline min-h-[40px] text-xs text-red border-red/30 hover:bg-red/5 w-full"
            onClick={() => onDelete(d)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function DeviceCardGrid({
  devices,
  isLoading,
  canManage,
  selectable,
  isSelected,
  onToggleSelect,
  syncing,
  onSync,
  onTest,
  onEdit,
  onDelete,
}: {
  devices: Device[];
  isLoading: boolean;
  canManage: boolean;
  selectable?: boolean;
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string) => void;
  syncing: Record<string, boolean>;
  onSync: (id: string) => void;
  onTest: (id: string) => void;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
}) {
  if (isLoading) {
    return <div className="card p-10 text-center text-text-muted text-sm">Loading...</div>;
  }
  if (devices.length === 0) {
    return <div className="card p-10 text-center text-text-muted text-sm">No devices registered yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {devices.map((d) => (
        <DeviceCard
          key={d._id}
          d={d}
          canManage={canManage}
          selectable={selectable}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          syncing={syncing}
          onSync={onSync}
          onTest={onTest}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
