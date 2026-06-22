import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

const auditCreate = vi.fn();
const auditFind = vi.fn();
const auditCount = vi.fn();

vi.mock('../src/models/AuditLog.js', () => ({
  AuditLogModel: {
    create: (...args: unknown[]) => auditCreate(...args),
    find: (...args: unknown[]) => auditFind(...args),
    countDocuments: (...args: unknown[]) => auditCount(...args),
  },
}));

vi.mock('../src/services/audit.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/audit.service.js')>();
  return {
    ...actual,
    audit: (...args: unknown[]) => auditCreate(...args),
  };
});

const {
  logUiActivity,
  listMyActivity,
  listOrgActivity,
  buildCategoryFilter,
  assertUiPayloadSize,
  settingsSectionFromChangedFields,
  diffSettingsValues,
} = await import('../src/services/activity.service.js');

describe('activity.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logUiActivity writes audit with userId', async () => {
    auditCreate.mockResolvedValue({});
    await logUiActivity(
      { userId: String(new Types.ObjectId()), ipAddress: '1.2.3.4', userAgent: 'test' },
      {
        eventType: 'ui.employees.search',
        page: 'employees',
        action: 'search',
        payload: { search: 'rahul' },
      }
    );
    expect(auditCreate).toHaveBeenCalledWith(
      'ui.employees.search',
      expect.objectContaining({ userId: expect.any(String) }),
      expect.objectContaining({
        payload: expect.objectContaining({ page: 'employees', search: 'rahul' }),
      })
    );
  });

  it('assertUiPayloadSize rejects oversized payload', () => {
    expect(() => assertUiPayloadSize({ data: 'x'.repeat(5000) })).toThrow();
  });

  it('listMyActivity scopes to userId', async () => {
    const userId = String(new Types.ObjectId());
    auditCount.mockResolvedValue(1);
    auditFind.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => [
              {
                _id: new Types.ObjectId(),
                occurredAt: new Date('2026-06-02T10:00:00.000Z'),
                eventType: 'login',
                entityType: null,
                entityId: null,
                payload: {},
              },
            ],
          }),
        }),
      }),
    });

    const result = await listMyActivity(userId, { page: 1, pageSize: 50 });
    expect(result.total).toBe(1);
    expect(auditCount).toHaveBeenCalledWith(
      expect.objectContaining({ userId: expect.any(Types.ObjectId) })
    );
  });

  it('settingsSectionFromChangedFields maps company fields', () => {
    expect(settingsSectionFromChangedFields(['companyName'])).toBe('company');
    expect(settingsSectionFromChangedFields(['smartAnchorEnabled'])).toBe('smart_anchor');
    expect(settingsSectionFromChangedFields(['cin'])).toBe('compliance');
    expect(settingsSectionFromChangedFields(['exportNaming'])).toBe('export_naming');
  });

  it('diffSettingsValues records only keys whose values changed', () => {
    const doc = {
      companyName: 'Makson Group',
      registeredAddress: 'Surendranagar',
      signatoryName: 'Priya Patel',
      signatoryDesignation: 'HR Head',
    };
    const patch = {
      companyName: 'Makson Pharma',
      registeredAddress: 'Surendranagar',
      signatoryName: 'Priya Patel',
      signatoryDesignation: 'HR Head',
    };
    const { changedFields, before, after } = diffSettingsValues(doc, patch);
    expect(changedFields).toEqual(['companyName']);
    expect(before.companyName).toBe('Makson Group');
    expect(after.companyName).toBe('Makson Pharma');
  });

  it('diffSettingsValues returns empty when patch matches doc', () => {
    const doc = { companyName: 'Same', cin: 'U123' };
    const { changedFields } = diffSettingsValues(doc, { companyName: 'Same', cin: 'U123' });
    expect(changedFields).toEqual([]);
  });

  it('buildCategoryFilter maps auth to login events', () => {
    expect(buildCategoryFilter('auth')).toEqual({
      eventType: { $in: ['login', 'logout', 'password_changed'] },
    });
  });

  it('buildCategoryFilter maps company to settings sections', () => {
    expect(buildCategoryFilter('company')).toEqual({
      eventType: 'settings_changed',
      'payload.section': { $in: ['company', 'compliance', 'brand_assets'] },
    });
  });

  it('buildCategoryFilter returns null for all', () => {
    expect(buildCategoryFilter('all')).toBeNull();
  });

  it('buildCategoryFilter maps employees to employee lifecycle events', () => {
    expect(buildCategoryFilter('employees')).toEqual({
      eventType: { $in: ['employee_created', 'employee_updated', 'employee_deleted', 'csv_import'] },
    });
  });

  it('listOrgActivity applies category filter', async () => {
    auditCount.mockResolvedValue(0);
    auditFind.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => [],
          }),
        }),
      }),
    });

    await listOrgActivity({ page: 1, pageSize: 50, category: 'auth' });

    expect(auditCount).toHaveBeenCalledWith(
      expect.objectContaining({
        $and: expect.arrayContaining([
          expect.objectContaining({
            eventType: { $in: ['login', 'logout', 'password_changed'] },
          }),
        ]),
      })
    );
  });
});
