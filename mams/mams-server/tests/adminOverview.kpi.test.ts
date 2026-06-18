import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminOverviewKpiConfigSchema, DEFAULT_ADMIN_OVERVIEW_KPI } from '@mams/types';

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

const { getAdminOverviewKpi, saveAdminOverviewKpi } = await import(
  '../src/services/adminOverviewKpi.service.js'
);

describe('AdminOverviewKpiConfigSchema', () => {
  it('accepts valid unique 4-slot config', () => {
    expect(
      AdminOverviewKpiConfigSchema.parse({
        slots: ['active_users', 'org_admins', 'devices_online', 'total_active'],
      })
    ).toEqual(DEFAULT_ADMIN_OVERVIEW_KPI);
  });

  it('rejects duplicate slots', () => {
    expect(() =>
      AdminOverviewKpiConfigSchema.parse({
        slots: ['active_users', 'active_users', 'org_admins', 'devices_online'],
      })
    ).toThrow(/unique/i);
  });
});

describe('adminOverviewKpi.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default when user has no kpi config', async () => {
    findById.mockResolvedValue(null);
    await expect(getAdminOverviewKpi('user1')).resolves.toEqual(DEFAULT_ADMIN_OVERVIEW_KPI);
  });

  it('saves validated config', async () => {
    const config = {
      slots: ['audit_events_7d', 'failed_logins_7d', 'present', 'total_active'],
    } as const;
    findByIdAndUpdate.mockResolvedValue({});
    await expect(saveAdminOverviewKpi('user1', { slots: [...config.slots] })).resolves.toEqual({
      slots: [...config.slots],
    });
  });
});
