/**
 * Seed script.
 * Creates: 2 seed users, 1 settings doc, 1,800 employees, 10 devices,
 * attendance for rolling IST days plus optional demo anchor (SEED_DEMO_ANCHOR_DATE),
 * audit logs, and leave demo data using Smart Anchor v2.
 *
 * Idempotent on the master collections: drops & re-creates them.
 * Run: npm run seed
 *
 * Seed user emails/password: set SEED_* in `mams-server/.env` (see .env.example).
 * Login always reads users from MongoDB — this script only inserts them.
 */
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { UserModel } from '../src/models/User.js';
import { EmployeeModel } from '../src/models/Employee.js';
import { DeviceModel } from '../src/models/Device.js';
import { SettingsModel } from '../src/models/Settings.js';
import { AttendanceRawModel } from '../src/models/AttendanceRaw.js';
import { AttendanceDerivedModel } from '../src/models/AttendanceDerived.js';
import { AuditLogModel } from '../src/models/AuditLog.js';
import { recomputeDerived } from '../src/services/attendance.service.js';
import { PERMISSIONS_BY_ROLE } from '@mams/types';
import { generateEmployees } from './generators.js';
import { utcToIstDateString } from '../src/utils/time.js';
import { logger } from '../src/utils/logger.js';
import { seededRandom } from '../src/utils/prng.js';
import { fromZonedTime } from 'date-fns-tz';
import type { Types } from 'mongoose';
import { seedLeaveData, wipeLeaveCollections } from './leaveSeed.js';
import { seedAuditData } from './auditSeed.js';
import {
  barChartSeedDays,
  buildMergedSeedDays,
  resolveDemoAnchorDate,
} from './seedDateRanges.js';

const IST = 'Asia/Kolkata';

/** Weekday absent / late weights (Mon..Sun) — shared by punch seed and dashboard day demo. */
const ABS_RATES = [0.09, 0.065, 0.055, 0.07, 0.11, 0.16, 0.22];
const LATE_RATES = [0.15, 0.10, 0.09, 0.11, 0.14, 0.07, 0.05];

const SeedUsersEnvSchema = z.object({
  SEED_ORG_ADMIN_EMAIL: z.string().email().default('org.admin@makson-group.com'),
  SEED_ORG_ADMIN_NAME: z.string().min(1).default('Organization Admin'),
  SEED_HR_ADMIN_EMAIL: z.string().email().default('hr.admin@makson-group.com'),
  SEED_HR_COMPLIANCE_EMAIL: z.string().email().default('hr.compliance@makson-group.com'),
  SEED_DEFAULT_PASSWORD: z.string().min(8).default('makson2026'),
  SEED_HR_ADMIN_NAME: z.string().min(1).default('Priya Patel'),
  SEED_HR_COMPLIANCE_NAME: z.string().min(1).default('Compliance Auditor'),
});

function seedUserOptions() {
  return SeedUsersEnvSchema.parse(process.env);
}

function resolveDemoAnchorFromEnv(): string {
  return resolveDemoAnchorDate(new Date());
}

async function main() {
  await connectDb();
  logger.info('Seed starting');
  const seedUsers = seedUserOptions();

  // Wipe master collections. attendance_raw uses Mongoose pre-hooks that forbid deleteMany;
  // use native collection delete in dev seed only (bypasses hooks — never do this in production code paths).
  await Promise.all([
    UserModel.deleteMany({}),
    SettingsModel.deleteMany({}),
    EmployeeModel.deleteMany({}),
    DeviceModel.deleteMany({}),
    AttendanceRawModel.collection.deleteMany({}),
    AttendanceDerivedModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    wipeLeaveCollections(),
  ]);
  logger.info('Wiped master collections');

  // Users (credentials from env with Makson defaults — login reads these rows from DB)
  const passwordHash = await bcrypt.hash(seedUsers.SEED_DEFAULT_PASSWORD, 10);
  const users = await UserModel.create([
    {
      email: seedUsers.SEED_ORG_ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      name: seedUsers.SEED_ORG_ADMIN_NAME,
      role: 'org.admin',
      permissions: PERMISSIONS_BY_ROLE['org.admin'],
      viewMode: 'real',
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: seedUsers.SEED_HR_ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      name: seedUsers.SEED_HR_ADMIN_NAME,
      role: 'hr.admin',
      permissions: PERMISSIONS_BY_ROLE['hr.admin'],
      viewMode: 'real',
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: seedUsers.SEED_HR_COMPLIANCE_EMAIL.toLowerCase(),
      passwordHash,
      name: seedUsers.SEED_HR_COMPLIANCE_NAME,
      role: 'hr.compliance',
      permissions: PERMISSIONS_BY_ROLE['hr.compliance'],
      viewMode: 'compliant',
      isActive: true,
      mustChangePassword: false,
    },
  ]);
  const adminUser = users[1]!;
  logger.info('Created seed users', {
    orgAdminEmail: seedUsers.SEED_ORG_ADMIN_EMAIL,
    adminEmail: seedUsers.SEED_HR_ADMIN_EMAIL,
    complianceEmail: seedUsers.SEED_HR_COMPLIANCE_EMAIL,
  });

  // Settings
  await SettingsModel.create({});
  logger.info('Created settings singleton');

  // Devices - 9 from the mockup
  await DeviceModel.create([
    { deviceCode: 'DEV-001', serialNumber: 'TFDB244600829', vendor: 'eSSL', protocolMode: 'push', model: 'eSSL SilkBio-101TC', name: 'Main Gate - Entry', department: 'Admin', location: 'Surendranagar, GJ', ipAddress: '192.168.0.240', isActive: true, lastPingAt: new Date() },
    { deviceCode: 'DEV-002', serialNumber: 'TFDB244600830', vendor: 'eSSL', protocolMode: 'push', model: 'eSSL X990', name: 'Main Gate - Exit', department: 'Admin', location: 'Surendranagar, GJ', ipAddress: '192.168.0.241', isActive: true, lastPingAt: new Date() },
    { deviceCode: 'DEV-003', serialNumber: 'TFDB244600831', vendor: 'eSSL', protocolMode: 'push', model: 'eSSL X990', name: 'Unit 2', department: 'Tablet Manufacturing', location: 'Surendranagar, GJ', ipAddress: '192.168.0.242', isActive: true, lastPingAt: new Date() },
    { deviceCode: 'DEV-004', serialNumber: 'TFDB244600832', vendor: 'eSSL', protocolMode: 'push', model: 'eSSL eFace990', name: 'Pharma Block', department: 'Tablet Manufacturing', location: 'Mandideep, MP', ipAddress: '192.168.1.10', isActive: true, lastPingAt: new Date() },
    { deviceCode: 'DEV-005', serialNumber: 'TFDB244600833', vendor: 'eSSL', protocolMode: 'push', model: 'eSSL K30 Pro', name: 'Healthcare Unit', department: 'Quality Control', location: 'Mandideep, MP', ipAddress: '192.168.1.11', isActive: true, lastPingAt: new Date() },
    { deviceCode: 'DEV-006', serialNumber: 'TFDB244600834', vendor: 'eSSL', protocolMode: 'push', model: 'eSSL X990', name: 'Machinery Div', department: 'Maintenance', location: 'Gummadidala, TG', ipAddress: '192.168.2.10', isActive: true, lastPingAt: new Date(Date.now() - 47 * 60 * 1000) },
    { deviceCode: 'DEV-007', serialNumber: 'TFDB244600835', vendor: 'eSSL', protocolMode: 'push', model: 'eSSL eFace990', name: 'Tiles Factory', department: 'Packaging', location: 'Morbi, GJ', ipAddress: '192.168.3.10', isActive: true, lastPingAt: new Date() },
    { deviceCode: 'DEV-008', serialNumber: 'TFDB244600836', vendor: 'eSSL', protocolMode: 'push', model: 'eSSL X990', name: 'Warehouse A', department: 'Warehouse', location: 'Surendranagar, GJ', ipAddress: '192.168.0.243', isActive: true, lastPingAt: new Date() },
    { deviceCode: 'DEV-009', serialNumber: 'SIM0000001', vendor: 'eSSL', protocolMode: 'push', model: 'Local Simulator', name: 'Dev Simulator', department: 'HR', location: 'Surendranagar, GJ', ipAddress: '127.0.0.1', isActive: true, lastPingAt: new Date() },
    {
      deviceCode: 'DEV-010',
      serialNumber: 'HNV-F710-0001',
      vendor: 'Hanvon',
      protocolMode: 'push',
      model: 'Hanvon FaceID F710',
      name: 'Legacy Gate (Hanvon)',
      department: 'Admin',
      location: 'Surendranagar, GJ',
      ipAddress: '192.168.0.250',
      integrationConfig: { pushToken: 'hanvon-dev-token-change-me' },
      isActive: true,
      lastPingAt: new Date(),
    },
  ]);
  logger.info('Created 10 devices (eSSL + Hanvon dev simulator HNV-F710-0001)');

  // Employees
  const mockEmps = generateEmployees(1800);
  const empDocs = await EmployeeModel.insertMany(mockEmps);
  logger.info(`Created ${empDocs.length} employees`);

  await seedLeaveData({
    adminUserId: adminUser._id,
    sampleEmployeeIds: empDocs.slice(0, 3).map((e) => e._id),
    anchorDate: resolveDemoAnchorFromEnv(),
  });

  await SettingsModel.updateOne({}, { $set: { employeeCodeSequence: 1800 } });
  logger.info('Set employeeCodeSequence to 1800 for next modal hire (MKS1801)');

  // Attendance: rolling IST window + optional demo anchor (SEED_DEMO_ANCHOR_DATE).
  const now = new Date();
  const { days, anchorDate, rollingDays, anchorDays } = buildMergedSeedDays(now);
  logger.info('Seed date ranges', {
    anchorDate,
    rollingFrom: rollingDays[0]?.date,
    rollingTo: rollingDays[rollingDays.length - 1]?.date,
    totalDays: days.length,
    anchorFrom: anchorDays[0]?.date,
    anchorTo: anchorDays[anchorDays.length - 1]?.date,
  });

  let rawTotal = 0;
  for (const day of days) {
    const rawBatch: any[] = [];
    for (const emp of empDocs) {
      if (emp.status !== 'Active') continue;
      const r = seededRandom(emp.empCode.charCodeAt(3) * 731 + parseInt(day.date.replace(/-/g, '')) * 13);
      const isWeeklyOff = (emp.weeklyOff ?? []).includes(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day.weekdayIdx]!);
      if (isWeeklyOff) continue;
      const isAbsent = r() < (ABS_RATES[day.weekdayIdx] ?? 0.1);
      if (isAbsent) continue;

      const isLate = r() < (LATE_RATES[day.weekdayIdx] ?? 0.12);
      const isDay = emp.timeShift === 'Day';
      let bH: number, bM: number, bS: number;
      if (isDay) {
        if (isLate) { bH = 9 + Math.floor(r() * 2); bM = Math.floor(r() * 45) + 15; }
        else { bH = 6 + Math.floor(r() * 3); bM = Math.floor(r() * 55); }
        bS = Math.floor(r() * 60);
      } else {
        if (isLate) { bH = 20 + Math.floor(r() * 2); bM = Math.floor(r() * 40) + 20; }
        else { bH = 18 + Math.floor(r() * 2); bM = Math.floor(r() * 50); }
        bS = Math.floor(r() * 60);
      }
      const shiftLen = 9.5 + r() * 2.0;
      const xH = bH + Math.floor(shiftLen);
      const xM = Math.floor((shiftLen % 1) * 60);

      const entryIst = `${day.date}T${pad(bH)}:${pad(bM)}:${pad(bS)}`;
      const exitIst = `${day.date}T${pad(xH % 24)}:${pad(xM)}:00`;
      const entryUtc = fromZonedTime(entryIst, IST);
      const exitUtc = fromZonedTime(exitIst, IST);

      rawBatch.push(
        {
          employeeId: emp._id,
          biometricId: emp.biometricId,
          deviceId: null,
          punchType: 'IN',
          rawTimestamp: entryUtc,
          rawDate: day.date,
          rawPayload: { source: 'seed' },
          receivedAt: new Date(),
          sourceIp: '127.0.0.1',
        },
        {
          employeeId: emp._id,
          biometricId: emp.biometricId,
          deviceId: null,
          punchType: 'OUT',
          rawTimestamp: exitUtc,
          rawDate: day.date,
          rawPayload: { source: 'seed' },
          receivedAt: new Date(),
          sourceIp: '127.0.0.1',
        }
      );
    }
    if (rawBatch.length > 0) {
      await AttendanceRawModel.insertMany(rawBatch, { ordered: false });
      rawTotal += rawBatch.length;
    }
  }
  logger.info(`Created ${rawTotal} raw attendance records (${days.length} IST days)`);

  // Recompute derived for every (active emp, day) pair.
  // For a real seed at 1,800 employees * 7 days = 12,600 derived rows. Run in batches.
  const empIds = empDocs.filter((e) => e.status === 'Active').map((e) => e._id);
  let derivedCount = 0;
  for (const day of days) {
    const batchSize = 200;
    for (let i = 0; i < empIds.length; i += batchSize) {
      const slice = empIds.slice(i, i + batchSize);
      await Promise.all(slice.map((id) => recomputeDerived(id as Types.ObjectId, day.date, 'seed')));
      derivedCount += slice.length;
    }
  }
  logger.info(`Computed ${derivedCount} attendance_derived records via Smart Anchor v2`);

  const activeEmps = empDocs.filter((e) => e.status === 'Active');
  const demoDays = barChartSeedDays(days, now);
  for (const day of demoDays) {
    await applyDashboardDayDemo(activeEmps, day.date, day.weekdayIdx);
  }

  const auditCount = await seedAuditData({
    dates: days.map((d) => d.date),
    users: users.map((u) => ({ _id: u._id, email: u.email, role: u.role })),
  });

  const anchorLoginAt = new Date(`${anchorDate}T10:30:00+05:30`);
  const recentLoginAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  await Promise.all(
    users.map((u, i) =>
      UserModel.updateOne(
        { _id: u._id },
        {
          $set: {
            lastLoginAt: i === 0 ? anchorLoginAt : recentLoginAt,
          },
        }
      )
    )
  );

  for (const day of demoDays) {
    const present = await AttendanceDerivedModel.countDocuments({ date: day.date, status: 'Present' });
    const absent = await AttendanceDerivedModel.countDocuments({
      date: day.date,
      status: { $in: ['Absent', 'Weekly Off', 'Half Day'] },
    });
    logger.info('Dashboard seed snapshot', {
      date: day.date,
      present,
      absent,
      activeEmployees: activeEmps.length,
    });
  }

  const anchorPresent = await AttendanceDerivedModel.countDocuments({
    date: anchorDate,
    status: 'Present',
  });
  const anchorAbsent = await AttendanceDerivedModel.countDocuments({
    date: anchorDate,
    status: { $in: ['Absent', 'Weekly Off', 'Half Day'] },
  });
  logger.info('Demo anchor snapshot', {
    anchorDate,
    present: anchorPresent,
    absent: anchorAbsent,
    auditLogs: auditCount,
  });

  logger.info('Seed done');
  await disconnectDb();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Force derived rows for one IST date using the same weekday absent/late weights as punch seed.
 * Ensures bar (present count), donut (on-time/delay/on-leave), and table rows stay consistent.
 */
async function applyDashboardDayDemo(
  activeEmps: Array<{ _id: Types.ObjectId; empCode: string; timeShift: 'Day' | 'Night' }>,
  demoDate: string,
  weekdayIdx: number
) {
  const n = activeEmps.length;
  if (n === 0) return;

  const absentRate = ABS_RATES[weekdayIdx] ?? 0.1;
  const lateRateAmongPresent = LATE_RATES[weekdayIdx] ?? 0.12;
  const onLeaveCount = Math.round(n * absentRate);
  const presentCount = n - onLeaveCount;
  const delayCount = Math.round(presentCount * lateRateAmongPresent);
  const onTimeCount = Math.max(0, presentCount - delayCount);

  const sorted = [...activeEmps].sort((a, b) =>
    `${demoDate}:${a.empCode}`.localeCompare(`${demoDate}:${b.empCode}`)
  );
  const onLeaveEmps = sorted.slice(0, onLeaveCount);
  const delayEmps = sorted.slice(onLeaveCount, onLeaveCount + delayCount);
  const onTimeEmps = sorted.slice(onLeaveCount + delayCount, onLeaveCount + presentCount);

  const absentFields = {
    status: 'Absent',
    dayType: 'Working',
    realEntryAt: null,
    realExitAt: null,
    realGrossHours: 0,
    realNetHours: 0,
    breakMinutes: 0,
    compliantEntryAt: null,
    compliantExitAt: null,
    compliantHours: 0,
    otHours: 0,
    rawRecordIds: [],
  };

  for (const emp of onLeaveEmps) {
    await AttendanceDerivedModel.updateOne(
      { employeeId: emp._id, date: demoDate },
      { $set: absentFields }
    );
  }

  for (const emp of delayEmps) {
    const entryIst =
      emp.timeShift === 'Day' ? `${demoDate}T10:30:00` : `${demoDate}T21:00:00`;
    const exitIst =
      emp.timeShift === 'Day' ? `${demoDate}T19:00:00` : `${demoDate}T06:00:00`;
    const realEntryAt = fromZonedTime(entryIst, IST);
    const realExitAt = fromZonedTime(exitIst, IST);
    await AttendanceDerivedModel.updateOne(
      { employeeId: emp._id, date: demoDate },
      {
        $set: {
          status: 'Present',
          dayType: 'Working',
          realEntryAt,
          realExitAt,
          realGrossHours: 8,
          realNetHours: 7.5,
          breakMinutes: 30,
          compliantHours: 8,
          otHours: 0,
        },
      }
    );
  }

  for (const emp of onTimeEmps) {
    const entryIst =
      emp.timeShift === 'Day' ? `${demoDate}T08:00:00` : `${demoDate}T18:30:00`;
    const exitIst =
      emp.timeShift === 'Day' ? `${demoDate}T17:30:00` : `${demoDate}T03:30:00`;
    const realEntryAt = fromZonedTime(entryIst, IST);
    const realExitAt = fromZonedTime(exitIst, IST);
    await AttendanceDerivedModel.updateOne(
      { employeeId: emp._id, date: demoDate },
      {
        $set: {
          status: 'Present',
          dayType: 'Working',
          realEntryAt,
          realExitAt,
          realGrossHours: 8,
          realNetHours: 7.5,
          breakMinutes: 30,
          compliantHours: 8,
          otHours: 0,
        },
      }
    );
  }

  const { isLateEntry } = await import('../src/services/dashboard.service.js');
  let onTime = 0;
  let delay = 0;
  for (const emp of delayEmps) {
    const row = await AttendanceDerivedModel.findOne({ employeeId: emp._id, date: demoDate }).lean();
    if (row?.realEntryAt && isLateEntry(row.realEntryAt as Date, emp.timeShift)) delay += 1;
  }
  for (const emp of onTimeEmps) {
    const row = await AttendanceDerivedModel.findOne({ employeeId: emp._id, date: demoDate }).lean();
    if (row?.realEntryAt && !isLateEntry(row.realEntryAt as Date, emp.timeShift)) onTime += 1;
  }

  const present = await AttendanceDerivedModel.countDocuments({ date: demoDate, status: 'Present' });
  logger.info('Dashboard day demo', {
    date: demoDate,
    weekdayIdx,
    present,
    onTime,
    delay,
    onLeave: onLeaveCount,
    active: n,
  });
}

main().catch((err) => {
  logger.error('seed_failed', { err: String(err) });
  process.exit(1);
});
