import type { Device } from '../../api/devices';

export type DeviceConnectionState = 'pending_setup' | 'waiting_first_punch' | 'live';

export const CONNECTION_STATE_LABELS: Record<DeviceConnectionState, string> = {
  pending_setup: 'Pending setup',
  waiting_first_punch: 'Waiting for first punch',
  live: 'Live',
};

/** Lifecycle: registered → device reachable → punches ingested. */
export function getDeviceConnectionState(d: Device): DeviceConnectionState {
  if (!d.lastPingAt) return 'pending_setup';
  if (d.recentPunchCount <= 0) return 'waiting_first_punch';
  return 'live';
}

export function connectionStateBadgeTone(
  state: DeviceConnectionState
): 'gray' | 'amber' | 'green' {
  if (state === 'live') return 'green';
  if (state === 'waiting_first_punch') return 'amber';
  return 'gray';
}
