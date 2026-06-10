import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardKpiConfigSchema, DEFAULT_DASHBOARD_KPI } from '@mams/types';

const findById = vi.fn();
const findByIdAndUpdate = vi.fn();

vi.mock('../src/models/User.js', () => ({
  UserModel: {
    findById: (...args: unknown[]) => ({
      select: () => ({
        lean: () => findById(...args),
      }),
    }),
    findByIdAndUpdate: (...args: unknown[]) => findByIdAndUpdate(...args),
  },
}));

const { getDashboardKpi, saveDashboardKpi } = await import(
  '../src/services/dashboardKpi.service.js'
);

describe('DashboardKpiConfigSchema', () => {
  it('accepts valid unique 4-slot config', () => {
    expect(
      DashboardKpiConfigSchema.parse({
        slots: ['on_time', 'weekly_off', 'half_day', 'day_shift'],
      })
    ).toEqual({
      slots: ['on_time', 'weekly_off', 'half_day', 'day_shift'],
    });
  });

  it('rejects duplicate slots', () => {
    expect(() =>
      DashboardKpiConfigSchema.parse({
        slots: ['present', 'present', 'absent', 'late'],
      })
    ).toThrow(/unique/i);
  });

  it('rejects wrong length', () => {
    expect(() =>
      DashboardKpiConfigSchema.parse({
        slots: ['present', 'absent'],
      })
    ).toThrow();
  });
});

describe('dashboardKpi.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default when user has no kpi config', async () => {
    findById.mockResolvedValue(null);
    await expect(getDashboardKpi('user1')).resolves.toEqual(DEFAULT_DASHBOARD_KPI);
  });

  it('returns saved config', async () => {
    const saved = { slots: ['on_time', 'weekly_off', 'half_day', 'night_shift'] };
    findById.mockResolvedValue({ dashboardKpi: saved });
    await expect(getDashboardKpi('user1')).resolves.toEqual(saved);
  });

  it('falls back to default for invalid stored config', async () => {
    findById.mockResolvedValue({
      dashboardKpi: { slots: ['present', 'present', 'absent', 'late'] },
    });
    await expect(getDashboardKpi('user1')).resolves.toEqual(DEFAULT_DASHBOARD_KPI);
  });

  it('saves validated config', async () => {
    const config = {
      slots: ['attendance_rate', 'day_shift', 'night_shift', 'on_time'],
    } as const;
    findByIdAndUpdate.mockResolvedValue({});
    await expect(saveDashboardKpi('user1', { slots: [...config.slots] })).resolves.toEqual({
      slots: [...config.slots],
    });
    expect(findByIdAndUpdate).toHaveBeenCalledWith('user1', {
      dashboardKpi: { slots: [...config.slots] },
    });
  });
});
