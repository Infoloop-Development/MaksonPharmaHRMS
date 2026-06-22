import type { Device } from '../../api/devices';
import { DeviceCardGrid } from './DeviceCardGrid';

export function DeviceTable({
  devices,
  isLoading,
  canManage,
  syncing,
  onSync,
  onTest,
  onEdit,
  onDelete,
}: {
  devices: Device[];
  isLoading: boolean;
  canManage: boolean;
  syncing: Record<string, boolean>;
  onSync: (id: string) => void;
  onTest: (id: string) => void;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
}) {
  return (
    <DeviceCardGrid
      devices={devices}
      isLoading={isLoading}
      canManage={canManage}
      syncing={syncing}
      onSync={onSync}
      onTest={onTest}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
