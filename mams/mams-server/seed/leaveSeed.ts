import { DEFAULT_LEAVE_TYPES } from '@mams/types';
import type { Types } from 'mongoose';
import { LeaveTypeModel } from '../src/models/LeaveType.js';
import { HolidayModel } from '../src/models/Holiday.js';
import { LeaveApplicationModel } from '../src/models/LeaveApplication.js';
import { LeaveQuotaModel } from '../src/models/LeaveQuota.js';
import { LeaveQuotaLedgerModel } from '../src/models/LeaveQuotaLedger.js';
import { logger } from '../src/utils/logger.js';

export async function wipeLeaveCollections() {
  await Promise.all([
    LeaveTypeModel.deleteMany({}),
    HolidayModel.deleteMany({}),
    LeaveApplicationModel.deleteMany({}),
    LeaveQuotaModel.deleteMany({}),
    LeaveQuotaLedgerModel.deleteMany({}),
  ]);
}

export async function seedLeaveData(params: {
  adminUserId: Types.ObjectId;
  sampleEmployeeIds: Types.ObjectId[];
}) {
  const types = await LeaveTypeModel.insertMany(
    DEFAULT_LEAVE_TYPES.map((t, i) => ({ ...t, sortOrder: i }))
  );
  const paidType = types.find((t) => t.code === 'paid_leave')!;
  const casualType = types.find((t) => t.code === 'casual_leave')!;

  const year = new Date().getFullYear();
  await HolidayModel.insertMany([
    { name: 'Republic Day', date: `${year}-01-26`, type: 'National' },
    { name: 'Independence Day', date: `${year}-08-15`, type: 'National' },
    { name: 'Diwali', date: `${year}-11-01`, type: 'Company' },
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);

  if (params.sampleEmployeeIds[0]) {
    await LeaveApplicationModel.create({
      employeeId: params.sampleEmployeeIds[0],
      leaveTypeId: paidType._id,
      fromDate: today,
      toDate: today,
      totalDays: 1,
      reason: 'Family function',
      status: 'Approved',
      appliedBy: params.adminUserId,
      appliedAt: new Date(),
      decidedBy: params.adminUserId,
      decidedAt: new Date(),
      excludedHolidayDates: [],
    });
  }

  if (params.sampleEmployeeIds[1]) {
    await LeaveApplicationModel.create({
      employeeId: params.sampleEmployeeIds[1],
      leaveTypeId: casualType._id,
      fromDate: nextWeek,
      toDate: nextWeek,
      totalDays: 1,
      reason: 'Personal work',
      status: 'Pending',
      appliedBy: params.adminUserId,
      appliedAt: new Date(),
      excludedHolidayDates: [],
    });
  }

  logger.info('Seeded leave types, holidays, and sample applications');
}
