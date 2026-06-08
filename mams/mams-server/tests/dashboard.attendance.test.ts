import { describe, it, expect, vi, beforeEach } from 'vitest';

const findMock = vi.fn();
const distinctMock = vi.fn();

vi.mock('../src/models/AttendanceDerived.js', () => ({
  AttendanceDerivedModel: {
    find: (...args: unknown[]) => ({
      populate: () => ({
        lean: () => findMock(...args),
      }),
    }),
  },
}));

vi.mock('../src/models/Employee.js', () => ({
  EmployeeModel: {
    distinct: (...args: unknown[]) => distinctMock(...args),
  },
}));

const { listDashboardAttendance, listDashboardDepartments } = await import(
  '../src/services/dashboardAttendance.service.js'
);

const baseDate = '2026-06-02';

function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    date: baseDate,
    status: 'Present',
    realEntryAt: new Date('2026-06-02T03:30:00.000Z'), // 09:00 IST on-time
    realExitAt: new Date('2026-06-02T12:30:00.000Z'),
    realNetHours: 8.5,
    employeeId: {
      _id: { toString: () => 'emp1' },
      name: 'Rajesh Patel',
      empCode: 'EMP001',
      department: 'Confectionery',
      timeShift: 'Day',
      status: 'Active',
    },
    ...overrides,
  };
}

describe('listDashboardAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMock.mockResolvedValue([
      makeDoc(),
      makeDoc({
        realEntryAt: new Date('2026-06-02T03:46:00.000Z'), // 09:16 late
        employeeId: {
          _id: { toString: () => 'emp2' },
          name: 'Priya Shah',
          empCode: 'EMP002',
          department: 'Pharma',
          timeShift: 'Day',
          status: 'Active',
        },
      }),
      makeDoc({
        status: 'Absent',
        realEntryAt: null,
        realExitAt: null,
        realNetHours: null,
        employeeId: {
          _id: { toString: () => 'emp3' },
          name: 'Amit Joshi',
          empCode: 'EMP003',
          department: 'Confectionery',
          timeShift: 'Night',
          status: 'Active',
        },
      }),
    ]);
  });

  it('returns paginated rows for a date', async () => {
    const result = await listDashboardAttendance(
      { date: baseDate, status: 'All', page: 1, pageSize: 50 },
      'real'
    );
    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]?.empCode).toBe('EMP001');
    expect(result.items[0]?.displayStatus).toBe('Present');
    expect(result.items[1]?.displayStatus).toBe('Late');
    expect(result.items[2]?.displayStatus).toBe('Absent');
  });

  it('filters by department', async () => {
    const result = await listDashboardAttendance(
      { date: baseDate, department: 'Confectionery', status: 'All', page: 1, pageSize: 50 },
      'real'
    );
    expect(result.total).toBe(2);
    expect(result.items.every((r) => r.department === 'Confectionery')).toBe(true);
  });

  it('filters by shift', async () => {
    const result = await listDashboardAttendance(
      { date: baseDate, timeShift: 'Night', status: 'All', page: 1, pageSize: 50 },
      'real'
    );
    expect(result.total).toBe(1);
    expect(result.items[0]?.timeShift).toBe('Night');
  });

  it('filters by status Late', async () => {
    const result = await listDashboardAttendance(
      { date: baseDate, status: 'Late', page: 1, pageSize: 50 },
      'real'
    );
    expect(result.total).toBe(1);
    expect(result.items[0]?.displayStatus).toBe('Late');
  });

  it('filters by search on name or code', async () => {
    const result = await listDashboardAttendance(
      { date: baseDate, search: 'priya', status: 'All', page: 1, pageSize: 50 },
      'real'
    );
    expect(result.total).toBe(1);
    expect(result.items[0]?.employeeName).toBe('Priya Shah');
  });

  it('paginates results', async () => {
    const result = await listDashboardAttendance(
      { date: baseDate, status: 'All', page: 2, pageSize: 2 },
      'real'
    );
    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.empCode).toBe('EMP003');
  });

  it('formats entry stamp as HH:mm:ss.SSS', async () => {
    const result = await listDashboardAttendance(
      { date: baseDate, status: 'All', page: 1, pageSize: 1 },
      'real'
    );
    expect(result.items[0]?.entryStamp).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
  });
});

describe('listDashboardDepartments', () => {
  it('returns sorted distinct departments', async () => {
    distinctMock.mockResolvedValue(['Warehouse', 'Admin', 'Confectionery']);
    const deps = await listDashboardDepartments();
    expect(deps).toEqual(['Admin', 'Confectionery', 'Warehouse']);
  });
});
