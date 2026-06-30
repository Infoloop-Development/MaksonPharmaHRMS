import type { Device } from '../../api/devices';
import { DeviceCardGrid } from './DeviceCardGrid';

export function DeviceTable({
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
  return (
    <DeviceCardGrid
      devices={devices}
      isLoading={isLoading}
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
  );
}
