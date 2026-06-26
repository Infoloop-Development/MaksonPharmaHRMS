import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

const findEmployees = vi.fn();
const findOneAndUpdate = vi.fn();

vi.mock('../src/models/Employee.js', () => ({
  EmployeeModel: {
    find: (...args: unknown[]) => findEmployees(...args),
  },
}));

vi.mock('../src/models/ComplianceGeneratedAttendance.js', () => ({
  ComplianceGeneratedAttendanceModel: {
    findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args),
  },
}));

const { runComplianceAutogenForDate } = await import('../src/services/complianceAutogen.service.js');

describe('complianceAutogen.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findOneAndUpdate.mockResolvedValue({});
  });

  it('skips Sunday without touching employees', async () => {
    const result = await runComplianceAutogenForDate('2026-06-21');
    expect(result.skippedSunday).toBe(true);
    expect(result.generated).toBe(0);
    expect(findEmployees).not.toHaveBeenCalled();
  });

  it('generates in shift order A then B then C', async () => {
    const idA = new Types.ObjectId();
    const idB = new Types.ObjectId();
    const idC = new Types.ObjectId();
    findEmployees.mockReturnValue({
      select: () => ({
        lean: async () => [
          { _id: idC, alternateShift: 'C', name: 'Zara' },
          { _id: idA, alternateShift: 'A', name: 'Amy' },
          { _id: idB, alternateShift: 'B', name: 'Ben' },
        ],
      }),
    });

    const result = await runComplianceAutogenForDate('2026-06-25');
    expect(result.generated).toBe(3);
    expect(findOneAndUpdate).toHaveBeenCalledTimes(3);
    const firstCall = findOneAndUpdate.mock.calls[0]?.[0];
    expect(String(firstCall?.employeeId)).toBe(String(idA));
  });
});
