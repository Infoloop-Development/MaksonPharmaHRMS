import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { BASELINE_HOURS } from '@mams/types';

const employeeFind = vi.fn();
const complianceAggregate = vi.fn();
const realAggregate = vi.fn();

vi.mock('../src/models/Employee.js', () => ({
  EmployeeModel: {
    find: (...args: unknown[]) => employeeFind(...args),
  },
}));

vi.mock('../src/models/ComplianceGeneratedAttendance.js', () => ({
  ComplianceGeneratedAttendanceModel: {
    aggregate: (...args: unknown[]) => complianceAggregate(...args),
  },
}));

vi.mock('../src/models/AttendanceDerived.js', () => ({
  AttendanceDerivedModel: {
    aggregate: (...args: unknown[]) => realAggregate(...args),
  },
}));

const { buildFinancialReportRows } = await import(
  '../src/services/complianceFinancialReport.service.js'
);

describe('buildFinancialReportRows', () => {
  const emp1Id = new Types.ObjectId();
  const emp2Id = new Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
    employeeFind.mockReturnValue({
      select: () => ({
        sort: () => ({
          lean: () =>
            Promise.resolve([
              { _id: emp1Id, empCode: 'MKS0001', name: 'Prem Mehta' },
              { _id: emp2Id, empCode: 'MKS0002', name: 'Alice' },
            ]),
        }),
      }),
    });
    complianceAggregate.mockResolvedValue([
      { _id: emp1Id, total: 208 },
      { _id: emp2Id, total: 160 },
    ]);
    realAggregate.mockResolvedValue([
      { _id: emp1Id, total: 312 },
      { _id: emp2Id, total: 160 },
    ]);
  });

  it('includes all active employees with compliance from generated and real from logs', async () => {
    const rows = await buildFinancialReportRows('2026-05');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      name: 'Prem Mehta',
      complianceHours: 208,
      realHours: 312,
      complianceChequePayment: 208,
      paymentInCash: 104,
    });
    expect(rows[1]).toEqual({
      name: 'Alice',
      complianceHours: 160,
      realHours: 160,
      complianceChequePayment: 160,
      paymentInCash: 0,
    });
  });

  it('uses zero real hours when employee has no attendance logs', async () => {
    realAggregate.mockResolvedValue([]);
    const rows = await buildFinancialReportRows('2026-05');
    expect(rows[0]?.realHours).toBe(0);
    expect(rows[0]?.paymentInCash).toBe(0);
    expect(rows[0]?.complianceHours).toBe(BASELINE_HOURS);
  });
});
