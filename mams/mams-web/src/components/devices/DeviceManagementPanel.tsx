import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MAKSON_DEPARTMENTS, MAKSON_FACTORY_LOCATIONS } from '@mams/types';
import { devicesApi, type Device } from '../../api/devices';
import { useToast } from '../ui/Toast';
import { StatCard } from '../ui/StatCard';
import { DeviceSetupGuide } from './DeviceSetupGuide';
import { DeviceTable } from './DeviceTable';
import { DeviceRegisterModal } from './DeviceRegisterModal';
import { DevicePostRegisterModal } from './DevicePostRegisterModal';
import { GoLiveChecklist } from '../goLive/GoLiveChecklist';
import { OrphanPunchesPanel } from '../goLive/OrphanPunchesPanel';
import { GoLiveReadinessPanel } from '../goLive/GoLiveReadinessPanel';
import type { DeviceCreate } from '../../api/devices';
import {
  getDeviceConnectionState,
  CONNECTION_STATE_LABELS,
  type DeviceConnectionState,
} from './deviceConnectionState';

export function DeviceManagementPanel({
  canManage,
  showSetupGuide = true,
  showGoLivePanels = false,
  showStats = true,
}: {
  canManage: boolean;
  showSetupGuide?: boolean;
  showGoLivePanels?: boolean;
  showStats?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [locFilter, setLocFilter] = useState<string>('all');
  const [onlineFilter, setOnlineFilter] = useState<string>('all');
  const [connectionFilter, setConnectionFilter] = useState<string>('all');
  const [postRegister, setPostRegister] = useState<DeviceCreate | null>(null);

  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: devicesApi.list,
    refetchInterval: 30_000,
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => devicesApi.sync(id),
    onMutate: (id) => setSyncing((s) => ({ ...s, [id]: true })),
    onSettled: (_, __, id) => setSyncing((s) => ({ ...s, [id]: false })),
    onSuccess: (result) => {
      const extra = result.inserted != null ? ` (${result.inserted} new punches)` : '';
      toast(`Device sync completed${extra}`, 'success');
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Sync failed';
      toast(msg, 'error');
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: () => devicesApi.syncAll(),
    onSuccess: (result) => {
      toast(`Sync finished for ${result.count} devices`, result.ok ? 'success' : 'error');
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Sync All failed';
      toast(msg, 'error');
    },
  });

  const allDevices = data?.items ?? [];
  const filtered = useMemo(() => {
    return allDevices.filter((d) => {
      if (vendorFilter !== 'all' && (d.vendor ?? 'eSSL') !== vendorFilter) return false;
      if (deptFilter !== 'all' && (d.department ?? '') !== deptFilter) return false;
      if (locFilter !== 'all' && d.location !== locFilter) return false;
      if (onlineFilter === 'online' && !d.isOnline) return false;
      if (onlineFilter === 'offline' && d.isOnline) return false;
      if (connectionFilter !== 'all' && getDeviceConnectionState(d) !== connectionFilter) return false;
      return true;
    });
  }, [allDevices, vendorFilter, deptFilter, locFilter, onlineFilter, connectionFilter]);

  const online = allDevices.filter((d) => d.isOnline).length;
  const recentPunches = allDevices.reduce((sum, d) => sum + d.recentPunchCount, 0);

  const handleTest = async (id: string) => {
    try {
      const r = await devicesApi.test(id);
      toast(r.ok ? 'Connectivity OK' : (r.error ?? 'Connectivity failed'), r.ok ? 'success' : 'error');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Test failed';
      toast(msg, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {showGoLivePanels && <GoLiveChecklist />}
      {showSetupGuide && canManage && <DeviceSetupGuide />}

      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={allDevices.length} accent="primary" />
          <StatCard label="Online" value={online} accent="green" />
          <StatCard label="Offline" value={allDevices.length - online} accent="red" />
          <StatCard label="Punches (24h)" value={recentPunches.toLocaleString()} accent="amber" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-wrap xl:items-end gap-3">
        <label className="text-xs text-text-muted min-w-0">
          Vendor
          <select className="input block mt-1 text-sm" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="eSSL">eSSL</option>
            <option value="Hanvon">Hanvon</option>
          </select>
        </label>
        <label className="text-xs text-text-muted">
          Department
          <select className="input block mt-1 text-sm" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="all">All</option>
            {MAKSON_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-text-muted">
          Location
          <select className="input block mt-1 text-sm" value={locFilter} onChange={(e) => setLocFilter(e.target.value)}>
            <option value="all">All</option>
            {MAKSON_FACTORY_LOCATIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-text-muted">
          Network
          <select className="input block mt-1 text-sm" value={onlineFilter} onChange={(e) => setOnlineFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </label>
        <label className="text-xs text-text-muted">
          Connection
          <select
            className="input block mt-1 text-sm"
            value={connectionFilter}
            onChange={(e) => setConnectionFilter(e.target.value)}
          >
            <option value="all">All</option>
            {(Object.keys(CONNECTION_STATE_LABELS) as DeviceConnectionState[]).map((key) => (
              <option key={key} value={key}>
                {CONNECTION_STATE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        {canManage && (
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3 xl:ml-auto">
            <button
              type="button"
              className="btn-outline"
              onClick={() => syncAllMutation.mutate()}
              disabled={syncAllMutation.isPending}
            >
              {syncAllMutation.isPending ? 'Syncing all...' : 'Sync All'}
            </button>
            <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
              + Register device
            </button>
          </div>
        )}
      </div>

      <DeviceTable
        devices={filtered}
        isLoading={isLoading}
        canManage={canManage}
        syncing={syncing}
        onSync={(id) => syncMutation.mutate(id)}
        onTest={handleTest}
        onEdit={(d) => setEditDevice(d)}
      />

      {showGoLivePanels && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <OrphanPunchesPanel />
          <GoLiveReadinessPanel />
        </div>
      )}

      {addOpen && (
        <DeviceRegisterModal
          onClose={() => setAddOpen(false)}
          onRegistered={(registered) => setPostRegister(registered)}
        />
      )}
      {postRegister && (
        <DevicePostRegisterModal registered={postRegister} onClose={() => setPostRegister(null)} />
      )}
      {editDevice && (
        <DeviceRegisterModal editDevice={editDevice} onClose={() => setEditDevice(null)} />
      )}
    </div>
  );
}
