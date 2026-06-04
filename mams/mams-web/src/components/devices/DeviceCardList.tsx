import { Badge } from '../ui/Badge';
import { fmtIstTime } from '../../lib/format';
import type { Device } from '../../api/devices';
import {
  getDeviceConnectionState,
  CONNECTION_STATE_LABELS,
  connectionStateBadgeTone,
} from './deviceConnectionState';

export function DeviceCardList({
  devices,
  isLoading,
  canManage,
  syncing,
  onSync,
  onTest,
  onEdit,
}: {
  devices: Device[];
  isLoading: boolean;
  canManage: boolean;
  syncing: Record<string, boolean>;
  onSync: (id: string) => void;
  onTest: (id: string) => void;
  onEdit: (device: Device) => void;
}) {
  if (isLoading) {
    return <div className="card p-6 text-center text-text-muted text-sm">Loading...</div>;
  }
  if (devices.length === 0) {
    return <div className="card p-6 text-center text-text-muted text-sm">No devices registered yet.</div>;
  }

  return (
    <div className="space-y-3 md:hidden">
      {devices.map((d) => {
        const connState = getDeviceConnectionState(d);
        return (
          <div key={d._id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{d.name}</div>
                <div className="font-mono text-xs text-text-muted">{d.deviceCode}</div>
              </div>
              <Badge tone={connectionStateBadgeTone(connState)}>
                {CONNECTION_STATE_LABELS[connState]}
              </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div>
                <dt className="text-text-subtle uppercase tracking-wider">Vendor</dt>
                <dd>{d.vendor ?? 'eSSL'}</dd>
              </div>
              <div>
                <dt className="text-text-subtle uppercase tracking-wider">Network</dt>
                <dd>
                  <Badge tone={d.isOnline ? 'green' : 'red'}>{d.isOnline ? 'ONLINE' : 'OFFLINE'}</Badge>
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-text-subtle uppercase tracking-wider">Serial</dt>
                <dd className="font-mono">{d.serialNumber}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-text-subtle uppercase tracking-wider">Location</dt>
                <dd>{d.location}</dd>
              </div>
              <div>
                <dt className="text-text-subtle uppercase tracking-wider">24h punches</dt>
                <dd className="font-mono">{d.recentPunchCount}</dd>
              </div>
              <div>
                <dt className="text-text-subtle uppercase tracking-wider">Last ping</dt>
                <dd className="font-mono">{d.lastPingAt ? fmtIstTime(d.lastPingAt) : '—'}</dd>
              </div>
            </dl>
            {canManage && (
              <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                <button type="button" className="btn-outline flex-1 min-w-[80px] touch-target-sm" onClick={() => onTest(d._id)}>
                  Test
                </button>
                <button
                  type="button"
                  className="btn-outline flex-1 min-w-[80px] touch-target-sm"
                  onClick={() => onSync(d._id)}
                  disabled={!!syncing[d._id]}
                >
                  {syncing[d._id] ? '…' : 'Sync'}
                </button>
                <button type="button" className="btn-outline flex-1 min-w-[80px] touch-target-sm" onClick={() => onEdit(d)}>
                  Edit
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
