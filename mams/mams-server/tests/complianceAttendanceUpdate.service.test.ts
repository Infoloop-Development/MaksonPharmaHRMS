import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

const findByIdMock = vi.fn();
const saveMock = vi.fn();
const populateLeanMock = vi.fn();
const auditMock = vi.fn();

vi.mock('../src/models/ComplianceGeneratedAttendance.js', () => ({
  ComplianceGeneratedAttendanceModel: {
    findById: (...args: unknown[]) => findByIdMock(...args),
  },
}));

vi.mock('../src/services/audit.service.js', () => ({
  audit: (...args: unknown[]) => auditMock(...args),
}));

const { updateComplianceGeneratedAttendance } = await import(
  '../src/services/complianceAttendanceUpdate.service.js'
);

function makeDoc(overrides: Record<string, unknown> = {}) {
  const doc = {
    _id: new Types.ObjectId(),
    employeeId: new Types.ObjectId(),
    date: '2026-05-15',
    checkInAt: new Date('2026-05-15T03:30:00.000Z'),
    checkOutAt: new Date('2026-05-15T11:30:00.000Z'),
    checkOutNextDay: false,
    hoursWorked: 8,
    alternateShift: 'A',
    save: saveMock,
    ...overrides,
  };
  saveMock.mockResolvedValue(doc);
  return doc;
}

describe('updateComplianceGeneratedAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates allowed fields and writes audit event', async () => {
    const doc = makeDoc();
    const id = String(doc._id);
    let calls = 0;
    findByIdMock.mockImplementation((lookupId: unknown) => {
      if (String(lookupId) !== id) return null;
      calls += 1;
      if (calls === 1) return doc;
      return {
        populate: () => ({
          lean: () => populateLeanMock(),
        }),
      };
    });
    populateLeanMock.mockResolvedValue({ _id: id, hoursWorked: 9 });

    const result = await updateComplianceGeneratedAttendance(
      id,
      {
        hoursWorked: 9,
        alternateShift: 'B',
        adjustmentNote: 'Corrected shift assignment',
      },
      { userId: 'user1', ipAddress: '127.0.0.1' }
    );

    expect(doc.hoursWorked).toBe(9);
    expect(doc.alternateShift).toBe('B');
    expect(saveMock).toHaveBeenCalled();
    expect(auditMock).toHaveBeenCalledWith(
      'compliance_record_adjusted',
      { userId: 'user1', ipAddress: '127.0.0.1' },
      expect.objectContaining({
        entityType: 'compliance_attendance',
        entityId: doc._id,
      })
    );
    expect(result).toEqual({ _id: id, hoursWorked: 9 });
  });

  it('recomputes hours from clock times when hours not provided', async () => {
    const doc = makeDoc();
    const id = String(doc._id);
    let calls = 0;
    findByIdMock.mockImplementation((lookupId: unknown) => {
      if (String(lookupId) !== id) return null;
      calls += 1;
      if (calls === 1) return doc;
      return { populate: () => ({ lean: () => Promise.resolve({ _id: id }) }) };
    });

    await updateComplianceGeneratedAttendance(
      id,
      {
        checkInAt: '2026-05-15T03:30:00.000Z',
        checkOutAt: '2026-05-15T13:30:00.000Z',
        adjustmentNote: 'Extended shift',
      },
      { userId: 'user1', ipAddress: null }
    );

    expect(doc.hoursWorked).toBe(10);
    expect(doc.checkOutNextDay).toBe(false);
  });

  it('throws not_found for invalid id', async () => {
    await expect(
      updateComplianceGeneratedAttendance(
        'not-an-id',
        { adjustmentNote: 'Test note here' },
        { userId: 'user1', ipAddress: null }
      )
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('throws not_found when record missing', async () => {
    const id = String(new Types.ObjectId());
    findByIdMock.mockResolvedValue(null);
    await expect(
      updateComplianceGeneratedAttendance(
        id,
        { adjustmentNote: 'Test note here' },
        { userId: 'user1', ipAddress: null }
      )
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});
