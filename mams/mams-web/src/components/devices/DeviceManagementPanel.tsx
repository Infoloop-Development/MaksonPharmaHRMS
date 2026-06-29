import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MAKSON_DEPARTMENTS, MAKSON_FACTORY_LOCATIONS } from '@mams/types';
import { devicesApi, type Device } from '../../api/devices';
import { useToast } from '../ui/Toast';
import { DashboardStatCard } from '../ui/DashboardStatCard';
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
import { useActivityLog } from '../../hooks/useActivityLog';
import { ACTIVITY_QUERY_PREFIX } from '../../api/activity';
import { MobileFilterBar } from '../ui/MobileFilterBar';
import { countActiveFilters } from '../../lib/countActiveFilters';
import { CardSortSelect } from '../ui/CardSortSelect';
import { STAT_CARD_TOOLTIPS } from '../../lib/tooltips/statCardTooltips';

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
  const [cardSort, setCardSort] = useState('name-asc');
  const [postRegister, setPostRegister] = useState<DeviceCreate | null>(null);

  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const { logFilter } = useActivityLog();

  const logDeviceFilters = (patch: Partial<{
    vendor: string;
    department: string;
    location: string;
    network: string;
    connection: string;
  }>) => {
    logFilter('devices', 'filter', {
      vendor: patch.vendor ?? vendorFilter,
      department: patch.department ?? deptFilter,
      location: patch.location ?? locFilter,
      network: patch.network ?? onlineFilter,
      connection: patch.connection ?? connectionFilter,
    });
  };

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
      qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Sync All failed';
      toast(msg, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => devicesApi.delete(id),
    onSuccess: () => {
      toast('Device deleted', 'success');
      qc.invalidateQueries({ queryKey: ['devices'] });
      qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      toast(msg, 'error');
    },
  });

  const handleDelete = (device: Device) => {
    const ok = window.confirm(
      `Delete device "${device.name}" (${device.serialNumber})?\n\nThis frees the serial number so you can register it again. Existing attendance punches are kept.`
    );
    if (ok) deleteMutation.mutate(device._id);
  };

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

  const sortedFiltered = useMemo(() => {
    const list = [...filtered];
    const [field, dir] = cardSort.split('-') as [string, 'asc' | 'desc'];
    list.sort((a, b) => {
      let av = '';
      let bv = '';
      if (field === 'name') {
        av = a.name;
        bv = b.name;
      } else if (field === 'date') {
        av = a.lastPingAt ?? '';
        bv = b.lastPingAt ?? '';
      }
      const cmp = av.localeCompare(bv);
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, cardSort]);

  const online = allDevices.filter((d) => d.isOnline).length;
  const recentPunches = allDevices.reduce((sum, d) => sum + d.recentPunchCount, 0);

  const filterDefaults = {
    vendorFilter: 'all',
    deptFilter: 'all',
    locFilter: 'all',
    onlineFilter: 'all',
    connectionFilter: 'all',
  };
  const activeCount = countActiveFilters(
    { vendorFilter, deptFilter, locFilter, onlineFilter, connectionFilter },
    filterDefaults
  );

  const clearFilters = () => {
    setVendorFilter('all');
    setDeptFilter('all');
    setLocFilter('all');
    setOnlineFilter('all');
    setConnectionFilter('all');
  };

  const manageActions = canManage ? (
    <>
      <button
        type="button"
        className="btn-outline btn-sm"
        onClick={() => syncAllMutation.mutate()}
        disabled={syncAllMutation.isPending}
      >
        {syncAllMutation.isPending ? 'Syncing…' : 'Sync All'}
      </button>
      <button type="button" className="btn-primary btn-sm" data-tour-id="devices-register" onClick={() => setAddOpen(true)}>
        + Register
      </button>
    </>
  ) : undefined;

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
        <div className="dash-stat-grid mb-0" data-tour-id="devices-stats">
          <DashboardStatCard label="Total" value={String(allDevices.length)} sub="" accent="primary" selected={false} onClick={() => {}} tooltip={STAT_CARD_TOOLTIPS.devices.total} />
          <DashboardStatCard label="Online" value={String(online)} sub="" accent="green" selected={false} onClick={() => {}} tooltip={STAT_CARD_TOOLTIPS.devices.online} />
          <DashboardStatCard label="Offline" value={String(allDevices.length - online)} sub="" accent="red" selected={false} onClick={() => {}} tooltip={STAT_CARD_TOOLTIPS.devices.offline} />
          <DashboardStatCard label="Punches (24h)" value={recentPunches.toLocaleString()} sub="" accent="amber" selected={false} onClick={() => {}} tooltip={STAT_CARD_TOOLTIPS.devices.punches24h} />
        </div>
      )}

      <div data-tour-id="devices-filters">
      <MobileFilterBar
        activeCount={activeCount}
        onClear={clearFilters}
        actions={
          <>
            <CardSortSelect
              value={cardSort}
              onChange={setCardSort}
              options={[
                { value: 'name-asc', label: 'Name A–Z' },
                { value: 'name-desc', label: 'Name Z–A' },
                { value: 'date-desc', label: 'Last ping newest' },
                { value: 'date-asc', label: 'Last ping oldest' },
              ]}
            />
            {manageActions}
          </>
        }
        noCard
        className="mb-0"
        desktopClassName="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-3 items-end"
      >
        <label className="text-xs text-text-muted min-w-0 block">
          Vendor
          <select className="input block mt-1 text-sm w-full" value={vendorFilter} onChange={(e) => { setVendorFilter(e.target.value); logDeviceFilters({ vendor: e.target.value }); }}>
            <option value="all">All</option>
            <option value="eSSL">eSSL</option>
            <option value="Hanvon">Hanvon</option>
          </select>
        </label>
        <label className="text-xs text-text-muted block">
          Department
          <select className="input block mt-1 text-sm w-full" value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); logDeviceFilters({ department: e.target.value }); }}>
            <option value="all">All</option>
            {MAKSON_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-text-muted block">
          Location
          <select className="input block mt-1 text-sm w-full" value={locFilter} onChange={(e) => { setLocFilter(e.target.value); logDeviceFilters({ location: e.target.value }); }}>
            <option value="all">All</option>
            {MAKSON_FACTORY_LOCATIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-text-muted block">
          Network
          <select className="input block mt-1 text-sm w-full" value={onlineFilter} onChange={(e) => { setOnlineFilter(e.target.value); logDeviceFilters({ network: e.target.value }); }}>
            <option value="all">All</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </label>
        <label className="text-xs text-text-muted block">
          Connection
          <select
            className="input block mt-1 text-sm w-full"
            value={connectionFilter}
            onChange={(e) => { setConnectionFilter(e.target.value); logDeviceFilters({ connection: e.target.value }); }}
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
          <div className="hidden md:flex flex-wrap gap-2 lg:col-span-5 lg:justify-end">
            <button
              type="button"
              className="btn-outline"
              onClick={() => syncAllMutation.mutate()}
              disabled={syncAllMutation.isPending}
            >
              {syncAllMutation.isPending ? 'Syncing all...' : 'Sync All'}
            </button>
            <button type="button" className="btn-primary" data-tour-id="devices-register" onClick={() => setAddOpen(true)}>
              + Register device
            </button>
          </div>
        )}
      </MobileFilterBar>
      </div>

      <div data-tour-id="devices-list">
      <DeviceTable
        devices={sortedFiltered}
        isLoading={isLoading}
        canManage={canManage}
        syncing={syncing}
        onSync={(id) => syncMutation.mutate(id)}
        onTest={handleTest}
        onEdit={(d) => setEditDevice(d)}
        onDelete={handleDelete}
      />
      </div>

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
        <DevicePostRegisterModal
          registered={postRegister}
          onClose={() => {
            setPostRegister(null);
            qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
          }}
        />
      )}
      {editDevice && (
        <DeviceRegisterModal editDevice={editDevice} onClose={() => setEditDevice(null)} />
      )}
    </div>
  );
}
