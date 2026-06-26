import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { BASELINE_HOURS } from '@mams/types';

const employeeFind = vi.fn();
const aggregateMock = vi.fn();

vi.mock('../src/models/Employee.js', () => ({
  EmployeeModel: {
    find: (...args: unknown[]) => employeeFind(...args),
  },
}));

vi.mock('../src/models/ComplianceGeneratedAttendance.js', () => ({
  ComplianceGeneratedAttendanceModel: {
    aggregate: (...args: unknown[]) => aggregateMock(...args),
  },
}));

const { resolveComplianceReportEmployees } = await import(
  '../src/services/complianceMonthlyReport.service.js'
);

describe('resolveComplianceReportEmployees', () => {
  const emp1Id = new Types.ObjectId();
  const emp2Id = new Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
    employeeFind.mockReturnValue({
      select: () => ({
        sort: () => ({
          lean: () =>
            Promise.resolve([
              {
                _id: emp1Id,
                empCode: 'MKS0001',
                name: 'Alice',
                department: 'HR',
                alternateShift: 'A',
              },
              {
                _id: emp2Id,
                empCode: 'MKS0002',
                name: 'Bob',
                department: 'Ops',
                alternateShift: 'B',
              },
            ]),
        }),
      }),
    });
    aggregateMock.mockResolvedValue([
      { _id: emp1Id, total: 160 },
      { _id: emp2Id, total: 208 },
    ]);
  });

  it('includes all active employees with DB hours when no overrides', async () => {
    const rows = await resolveComplianceReportEmployees('2026-05', []);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ employeeId: String(emp1Id), totalHours: 160 });
    expect(rows[1]).toMatchObject({ employeeId: String(emp2Id), totalHours: 208 });
  });

  it('applies override hours only for selected employees', async () => {
    const rows = await resolveComplianceReportEmployees('2026-05', [
      { employeeId: String(emp1Id), totalHours: 312 },
    ]);
    expect(rows[0]?.totalHours).toBe(312);
    expect(rows[1]?.totalHours).toBe(208);
  });

  it('falls back to baseline when employee has no generated attendance', async () => {
    aggregateMock.mockResolvedValue([]);
    const rows = await resolveComplianceReportEmployees('2026-05', []);
    expect(rows.every((r) => r.totalHours === BASELINE_HOURS)).toBe(true);
  });

  it('resolves employees and builds a valid xlsx', async () => {
    const { buildComplianceMonthlyReportXlsx } = await import(
      '../src/services/complianceMonthlyReport.service.js'
    );
    const employees = await resolveComplianceReportEmployees('2026-05', []);
    const buffer = await buildComplianceMonthlyReportXlsx({ yearMonth: '2026-05', employees });
    expect(buffer.length).toBeGreaterThan(100);
  });
});
