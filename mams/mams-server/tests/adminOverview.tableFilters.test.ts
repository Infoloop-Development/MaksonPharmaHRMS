import { describe, it, expect, vi, beforeEach } from 'vitest';

const findUsers = vi.fn();
const countUsers = vi.fn();

vi.mock('../src/models/User.js', () => ({
  UserModel: {
    countDocuments: (...args: unknown[]) => countUsers(...args),
    find: (...args: unknown[]) => ({
      select: () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => findUsers(...args),
            }),
          }),
        }),
      }),
    }),
  },
}));

const findEmployees = vi.fn();
const countEmployees = vi.fn();

vi.mock('../src/models/Employee.js', () => ({
  EmployeeModel: {
    countDocuments: (...args: unknown[]) => countEmployees(...args),
    find: (...args: unknown[]) => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => findEmployees(...args),
          }),
        }),
      }),
    }),
  },
}));

const { listAdminOverviewUsers, listAdminOverviewEmployees } = await import(
  '../src/services/adminOverview.service.js'
);

describe('listAdminOverviewUsers filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    countUsers.mockResolvedValue(0);
    findUsers.mockResolvedValue([]);
  });

  it('applies role and active filters', async () => {
    await listAdminOverviewUsers({
      page: 1,
      pageSize: 20,
      role: 'org.admin',
      active: true,
    });
    expect(countUsers).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'org.admin', isActive: true })
    );
  });
});

describe('listAdminOverviewEmployees filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    countEmployees.mockResolvedValue(0);
    findEmployees.mockResolvedValue([]);
  });

  it('applies status and department filters', async () => {
    await listAdminOverviewEmployees({
      page: 1,
      pageSize: 20,
      status: 'Active',
      department: 'Production',
    });
    expect(countEmployees).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Active', department: expect.any(RegExp) })
    );
  });
});

describe('export naming admin overview keys', () => {
  it('includes admin overview export types', async () => {
    const { ExportTypeKeySchema, DEFAULT_EXPORT_NAMING } = await import('@mams/types');
    expect(ExportTypeKeySchema.options).toContain('adminOverviewUsersXlsx');
    expect(DEFAULT_EXPORT_NAMING.patterns.adminOverviewEmployeesXlsx).toContain('{extension}');
  });
});
