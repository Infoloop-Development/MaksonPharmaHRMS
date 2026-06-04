import { Badge } from '../ui/Badge';
import { fmtIstTime } from '../../lib/format';
import type { Device } from '../../api/devices';
import {
  getDeviceConnectionState,
  CONNECTION_STATE_LABELS,
  connectionStateBadgeTone,
} from './deviceConnectionState';
import { DeviceCardList } from './DeviceCardList';

export function DeviceTable({
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
  const colCount = canManage ? 14 : 13;

  return (
    <>
      <DeviceCardList
        devices={devices}
        isLoading={isLoading}
        canManage={canManage}
        syncing={syncing}
        onSync={onSync}
        onTest={onTest}
        onEdit={onEdit}
      />
      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
          <table className="w-full text-sm lg:min-w-0 xl:min-w-[1000px]">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-3 py-3 font-semibold">Code</th>
                <th className="px-3 py-3 font-semibold">Name</th>
                <th className="px-3 py-3 font-semibold">Vendor</th>
                <th className="px-3 py-3 font-semibold hidden lg:table-cell">Protocol</th>
                <th className="px-3 py-3 font-semibold">Department</th>
                <th className="px-3 py-3 font-semibold">Location</th>
                <th className="px-3 py-3 font-semibold">Serial</th>
                <th className="px-3 py-3 font-semibold hidden lg:table-cell">IP</th>
                <th className="px-3 py-3 font-semibold">Connection</th>
                <th className="px-3 py-3 font-semibold">Network</th>
                <th className="px-3 py-3 font-semibold">Last ping</th>
                <th className="px-3 py-3 font-semibold hidden xl:table-cell">Last sync</th>
                <th className="px-3 py-3 font-semibold hidden lg:table-cell">24h</th>
                {canManage && <th className="px-3 py-3 font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={colCount} className="px-4 py-10 text-center text-text-muted">
                    Loading...
                  </td>
                </tr>
              )}
              {!isLoading && devices.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="px-4 py-10 text-center text-text-muted">
                    No devices registered yet.
                  </td>
                </tr>
              )}
              {devices.map((d) => {
                const connState = getDeviceConnectionState(d);
                return (
                  <tr key={d._id} className="hover:bg-surface2/50 transition">
                    <td className="px-3 py-2.5 font-mono text-xs">{d.deviceCode}</td>
                    <td className="px-3 py-2.5 font-medium">{d.name}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone="blue">{d.vendor ?? 'eSSL'}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs uppercase hidden lg:table-cell">{d.protocolMode ?? 'push'}</td>
                    <td className="px-3 py-2.5 text-xs">{d.department ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-text-muted">{d.location}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{d.serialNumber}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-text-muted hidden lg:table-cell">
                      {d.ipAddress ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={connectionStateBadgeTone(connState)}>
                        {CONNECTION_STATE_LABELS[connState]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={d.isOnline ? 'green' : 'red'}>{d.isOnline ? 'ONLINE' : 'OFFLINE'}</Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-text-muted">
                      {d.lastPingAt ? fmtIstTime(d.lastPingAt) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] hidden xl:table-cell">
                      {d.lastSyncAt ? (
                        <span className={d.lastSyncStatus === 'error' ? 'text-red' : 'text-text-muted'}>
                          {fmtIstTime(d.lastSyncAt)}
                          {d.lastSyncStatus === 'error' && d.lastSyncError && (
                            <span className="block text-red max-w-[140px] truncate" title={d.lastSyncError}>
                              {d.lastSyncError}
                            </span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs hidden lg:table-cell">{d.recentPunchCount}</td>
                    {canManage && (
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="btn-outline text-xs py-2 px-2 touch-target-sm"
                            onClick={() => onTest(d._id)}
                          >
                            Test
                          </button>
                          <button
                            type="button"
                            className="btn-outline text-xs py-2 px-2 touch-target-sm"
                            onClick={() => onSync(d._id)}
                            disabled={!!syncing[d._id]}
                          >
                            {syncing[d._id] ? '…' : 'Sync'}
                          </button>
                          <button
                            type="button"
                            className="btn-outline text-xs py-2 px-2 touch-target-sm"
                            onClick={() => onEdit(d)}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
