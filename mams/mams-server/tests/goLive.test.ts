import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

const auditCount = vi.fn();
const auditFindChain = vi.fn();
const deviceFind = vi.fn();
const employeeFind = vi.fn();
const attendanceAggregate = vi.fn();

vi.mock('../src/models/AuditLog.js', () => ({
  AuditLogModel: {
    countDocuments: (...args: unknown[]) => auditCount(...args),
    find: (...args: unknown[]) => auditFindChain(...args),
  },
}));

vi.mock('../src/models/Device.js', () => ({
  DeviceModel: {
    find: (...args: unknown[]) => deviceFind(...args),
  },
}));

vi.mock('../src/models/Employee.js', () => ({
  EmployeeModel: {
    find: (...args: unknown[]) => employeeFind(...args),
  },
}));

vi.mock('../src/models/AttendanceRaw.js', () => ({
  AttendanceRawModel: {
    aggregate: (...args: unknown[]) => attendanceAggregate(...args),
  },
}));

const { listOrphanPunches, getGoLiveReadiness } = await import('../src/services/goLive.service.js');

describe('goLive.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps orphan_punch audit rows with device serial', async () => {
    const deviceId = new Types.ObjectId();
    auditCount.mockResolvedValue(1);
    auditFindChain.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => [
              {
                _id: new Types.ObjectId(),
                occurredAt: new Date('2026-06-02T10:00:00Z'),
                entityId: deviceId,
                ipAddress: '10.0.0.1',
                payload: { orphans: ['42'], vendor: 'eSSL' },
              },
            ],
          }),
        }),
      }),
    });
    deviceFind.mockReturnValue({
      select: () => ({
        lean: async () => [
          { _id: deviceId, deviceCode: 'GATE-1', serialNumber: 'SN-99', vendor: 'eSSL' },
        ],
      }),
    });

    const result = await listOrphanPunches({ page: 1, pageSize: 10, sinceDays: 7 });
    expect(result.total).toBe(1);
    expect(result.items[0]?.orphanIds).toEqual(['42']);
    expect(result.items[0]?.deviceSerial).toBe('SN-99');
  });

  it('counts active employees without punches in window', async () => {
    const id1 = new Types.ObjectId();
    const id2 = new Types.ObjectId();
    employeeFind.mockReturnValue({
      select: () => ({
        sort: () => ({
          lean: async () => [
            {
              _id: id1,
              empCode: 'MKS0001',
              name: 'A',
              biometricId: 'BIO001',
              department: 'Confectionery',
              location: 'Loc',
            },
            {
              _id: id2,
              empCode: 'MKS0002',
              name: 'B',
              biometricId: 'BIO002',
              department: 'Confectionery',
              location: 'Loc',
            },
          ],
        }),
      }),
    });
    attendanceAggregate.mockResolvedValue([{ _id: id1, lastPunch: new Date() }]);

    const report = await getGoLiveReadiness(7);
    expect(report.totalActive).toBe(2);
    expect(report.withRecentPunch).toBe(1);
    expect(report.withoutRecentPunch).toBe(1);
    expect(report.employeesWithoutPunch[0]?.biometricId).toBe('BIO002');
  });
});
