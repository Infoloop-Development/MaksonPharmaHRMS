/**
 * Seed script.
 * Creates: 2 seed users, 1 settings doc, 1,800 employees, 9 devices,
 * and 7 days of attendance using Smart Anchor v2 over generated punches.
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
import { recomputeDerived } from '../src/services/attendance.service.js';
import { PERMISSIONS_BY_ROLE } from '@mams/types';
import { generateEmployees } from './generators.js';
import { utcToIstDateString } from '../src/utils/time.js';
import { logger } from '../src/utils/logger.js';
import { seededRandom } from '../src/utils/prng.js';
import { fromZonedTime } from 'date-fns-tz';
import type { Types } from 'mongoose';

const IST = 'Asia/Kolkata';

const SeedUsersEnvSchema = z.object({
  SEED_HR_ADMIN_EMAIL: z.string().email().default('hr.admin@makson-group.com'),
  SEED_HR_COMPLIANCE_EMAIL: z.string().email().default('hr.compliance@makson-group.com'),
  SEED_DEFAULT_PASSWORD: z.string().min(8).default('makson2026'),
  SEED_HR_ADMIN_NAME: z.string().min(1).default('Priya Patel'),
  SEED_HR_COMPLIANCE_NAME: z.string().min(1).default('Compliance Auditor'),
});

function seedUserOptions() {
  return SeedUsersEnvSchema.parse(process.env);
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
  ]);
  logger.info('Wiped master collections');

  // Users (credentials from env with Makson defaults — login reads these rows from DB)
  const passwordHash = await bcrypt.hash(seedUsers.SEED_DEFAULT_PASSWORD, 10);
  await UserModel.create([
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
  logger.info('Created seed users', {
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

  await SettingsModel.updateOne({}, { $set: { employeeCodeSequence: 1800 } });
  logger.info('Set employeeCodeSequence to 1800 for next modal hire (MKS1801)');

  // Attendance: last 7 days
  // Use the same daily pattern as the mockup - weighted absent / late rates per weekday.
  const ABS_RATES = [0.09, 0.065, 0.055, 0.07, 0.11, 0.16, 0.22]; // Mon..Sun
  const LATE_RATES = [0.15, 0.10, 0.09, 0.11, 0.14, 0.07, 0.05];

  const today = new Date();
  const days: { date: string; weekdayIdx: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    days.push({ date: utcToIstDateString(d), weekdayIdx: dayIdxIst(d) });
  }

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
  logger.info(`Created ${rawTotal} raw attendance records (7 days)`);

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
  logger.info('Seed done');
  await disconnectDb();
}

function dayIdxIst(d: Date): number {
  // Monday = 0 ... Sunday = 6, matching ABS_RATES index ordering.
  const day = d.getUTCDay(); // 0=Sun..6=Sat in UTC; close enough for our seed
  return day === 0 ? 6 : day - 1;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

main().catch((err) => {
  logger.error('seed_failed', { err: String(err) });
  process.exit(1);
});
