import { describe, it, expect } from 'vitest';

/** Mirror of mams-web deviceConnectionState logic for regression safety. */
type DeviceConnectionState = 'pending_setup' | 'waiting_first_punch' | 'live';

function getDeviceConnectionState(d: {
  lastPingAt: string | null;
  recentPunchCount: number;
}): DeviceConnectionState {
  if (!d.lastPingAt) return 'pending_setup';
  if (d.recentPunchCount <= 0) return 'waiting_first_punch';
  return 'live';
}

describe('device connection state', () => {
  it('pending when never pinged', () => {
    expect(getDeviceConnectionState({ lastPingAt: null, recentPunchCount: 0 })).toBe('pending_setup');
  });

  it('waiting when pinged but no punches in 24h', () => {
    expect(
      getDeviceConnectionState({
        lastPingAt: new Date().toISOString(),
        recentPunchCount: 0,
      })
    ).toBe('waiting_first_punch');
  });

  it('live when punches received', () => {
    expect(
      getDeviceConnectionState({
        lastPingAt: new Date().toISOString(),
        recentPunchCount: 3,
      })
    ).toBe('live');
  });
});
