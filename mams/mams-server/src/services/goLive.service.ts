import { Types } from 'mongoose';
import { AuditLogModel } from '../models/AuditLog.js';
import { DeviceModel } from '../models/Device.js';
import { EmployeeModel } from '../models/Employee.js';
import { AttendanceRawModel } from '../models/AttendanceRaw.js';

export interface OrphanPunchRow {
  id: string;
  occurredAt: string;
  deviceId: string | null;
  deviceCode: string | null;
  deviceSerial: string | null;
  vendor: string | null;
  orphanIds: string[];
  sourceIp: string | null;
}

export async function listOrphanPunches(opts: {
  page: number;
  pageSize: number;
  sinceDays: number;
}): Promise<{ items: OrphanPunchRow[]; total: number; page: number; pageSize: number }> {
  const since = new Date(Date.now() - opts.sinceDays * 24 * 60 * 60 * 1000);
  const filter = { eventType: 'orphan_punch', occurredAt: { $gte: since } };

  const total = await AuditLogModel.countDocuments(filter);
  const logs = await AuditLogModel.find(filter)
    .sort({ occurredAt: -1 })
    .skip((opts.page - 1) * opts.pageSize)
    .limit(opts.pageSize)
    .lean();

  const deviceIds = [
    ...new Set(
      logs
        .map((l) => l.entityId)
        .filter((id): id is Types.ObjectId => id != null)
        .map((id) => String(id))
    ),
  ];
  const devices = await DeviceModel.find({ _id: { $in: deviceIds } })
    .select('deviceCode serialNumber vendor')
    .lean();
  const deviceMap = new Map(devices.map((d) => [String(d._id), d]));

  const items: OrphanPunchRow[] = logs.map((l) => {
    const payload = (l.payload ?? {}) as { orphans?: string[]; vendor?: string };
    const deviceId = l.entityId ? String(l.entityId) : null;
    const dev = deviceId ? deviceMap.get(deviceId) : undefined;
    return {
      id: String(l._id),
      occurredAt: (l.occurredAt ?? l.createdAt ?? new Date()).toISOString(),
      deviceId,
      deviceCode: dev?.deviceCode ?? null,
      deviceSerial: dev?.serialNumber ?? null,
      vendor: payload.vendor ?? dev?.vendor ?? null,
      orphanIds: Array.isArray(payload.orphans) ? payload.orphans : [],
      sourceIp: l.ipAddress ?? null,
    };
  });

  return { items, total, page: opts.page, pageSize: opts.pageSize };
}

export interface ReadinessEmployee {
  id: string;
  empCode: string;
  name: string;
  biometricId: string;
  department: string;
  location: string;
  lastPunchAt: string | null;
}

export async function getGoLiveReadiness(daysWithoutPunch: number): Promise<{
  daysWithoutPunch: number;
  totalActive: number;
  withRecentPunch: number;
  withoutRecentPunch: number;
  employeesWithoutPunch: ReadinessEmployee[];
}> {
  const since = new Date(Date.now() - daysWithoutPunch * 24 * 60 * 60 * 1000);

  const active = await EmployeeModel.find({ status: 'Active', isDeleted: { $ne: true } })
    .select('empCode name biometricId department location')
    .sort({ empCode: 1 })
    .lean();

  const recentByEmployee = await AttendanceRawModel.aggregate<{ _id: Types.ObjectId; lastPunch: Date }>([
    { $match: { rawTimestamp: { $gte: since } } },
    { $group: { _id: '$employeeId', lastPunch: { $max: '$rawTimestamp' } } },
  ]);
  const lastPunchMap = new Map(recentByEmployee.map((r) => [String(r._id), r.lastPunch]));

  const without: ReadinessEmployee[] = [];
  let withRecent = 0;

  for (const e of active) {
    const last = lastPunchMap.get(String(e._id));
    if (last) {
      withRecent += 1;
    } else {
      without.push({
        id: String(e._id),
        empCode: e.empCode,
        name: e.name,
        biometricId: e.biometricId,
        department: e.department,
        location: e.location,
        lastPunchAt: null,
      });
    }
  }

  return {
    daysWithoutPunch,
    totalActive: active.length,
    withRecentPunch: withRecent,
    withoutRecentPunch: without.length,
    employeesWithoutPunch: without.slice(0, 200),
  };
}
