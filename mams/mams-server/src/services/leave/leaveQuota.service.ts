import { Types } from 'mongoose';
import type { LeaveQuotaResetPolicy } from '@mams/types';
import { LeaveQuotaModel } from '../../models/LeaveQuota.js';
import { LeaveQuotaLedgerModel } from '../../models/LeaveQuotaLedger.js';
import { LeaveTypeModel } from '../../models/LeaveType.js';
import { EmployeeModel } from '../../models/Employee.js';
import { SettingsModel } from '../../models/Settings.js';
import { resolvePeriodKey } from './leavePeriod.service.js';

export interface QuotaBalance {
  entitled: number;
  consumed: number;
  manualAdjustment: number;
  remaining: number;
  periodKey: string;
}

async function getLeaveSettings() {
  const doc = await SettingsModel.findOne().lean();
  return {
    policy: (doc?.leaveQuotaResetPolicy ?? 'calendar_year') as LeaveQuotaResetPolicy,
    financialYearStartMonth: doc?.financialYearStartMonth ?? 4,
  };
}

export async function getOrCreateQuota(
  employeeId: string,
  leaveTypeId: string,
  asOfDate: string
): Promise<QuotaBalance & { quotaId: string }> {
  const [employee, leaveType, settings] = await Promise.all([
    EmployeeModel.findById(employeeId).lean(),
    LeaveTypeModel.findById(leaveTypeId).lean(),
    getLeaveSettings(),
  ]);
  if (!employee || !leaveType) {
    throw new Error('Employee or leave type not found');
  }

  const joinDate =
    employee.joinDate instanceof Date
      ? employee.joinDate.toISOString().slice(0, 10)
      : String(employee.joinDate).slice(0, 10);
  const { periodKey, periodType } = resolvePeriodKey(
    settings.policy,
    asOfDate,
    joinDate,
    settings.financialYearStartMonth
  );

  let quota = await LeaveQuotaModel.findOne({
    employeeId: new Types.ObjectId(employeeId),
    leaveTypeId: new Types.ObjectId(leaveTypeId),
    periodKey,
  });

  if (!quota) {
    quota = await LeaveQuotaModel.create({
      employeeId: new Types.ObjectId(employeeId),
      leaveTypeId: new Types.ObjectId(leaveTypeId),
      periodKey,
      periodType,
      entitled: leaveType.annualQuotaDefault ?? 0,
      consumed: 0,
      manualAdjustment: 0,
    });
  }

  const entitled = quota.entitled + quota.manualAdjustment;
  const remaining = Math.max(0, entitled - quota.consumed);

  return {
    quotaId: String(quota._id),
    entitled: quota.entitled,
    consumed: quota.consumed,
    manualAdjustment: quota.manualAdjustment,
    remaining,
    periodKey,
  };
}

export async function applyQuotaDelta(params: {
  employeeId: string;
  leaveTypeId: string;
  asOfDate: string;
  delta: number;
  reason: string;
  actorId: string;
  relatedApplicationId?: string;
  /** If true, delta reduces consumed (negative delta = restore). */
  consume?: boolean;
}): Promise<QuotaBalance> {
  const balance = await getOrCreateQuota(params.employeeId, params.leaveTypeId, params.asOfDate);
  const quota = await LeaveQuotaModel.findById(balance.quotaId);
  if (!quota) throw new Error('Quota not found');

  if (params.consume) {
    quota.consumed = Math.max(0, quota.consumed + params.delta);
  } else {
    quota.manualAdjustment = quota.manualAdjustment + params.delta;
  }
  await quota.save();

  const entitled = quota.entitled + quota.manualAdjustment;
  const remaining = Math.max(0, entitled - quota.consumed);

  await LeaveQuotaLedgerModel.create({
    employeeId: new Types.ObjectId(params.employeeId),
    leaveTypeId: new Types.ObjectId(params.leaveTypeId),
    periodKey: balance.periodKey,
    delta: params.delta,
    balanceAfter: remaining,
    reason: params.reason,
    actorId: new Types.ObjectId(params.actorId),
    relatedApplicationId: params.relatedApplicationId
      ? new Types.ObjectId(params.relatedApplicationId)
      : null,
    occurredAt: new Date(),
  });

  return {
    entitled: quota.entitled,
    consumed: quota.consumed,
    manualAdjustment: quota.manualAdjustment,
    remaining,
    periodKey: balance.periodKey,
  };
}

export async function consumeQuotaForLeave(params: {
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  days: number;
  paid: boolean;
  actorId: string;
  applicationId: string;
}): Promise<void> {
  if (!params.paid || params.days <= 0) return;
  await applyQuotaDelta({
    employeeId: params.employeeId,
    leaveTypeId: params.leaveTypeId,
    asOfDate: params.fromDate,
    delta: params.days,
    reason: `Leave approved (${params.days} day(s))`,
    actorId: params.actorId,
    relatedApplicationId: params.applicationId,
    consume: true,
  });
}

export async function restoreQuotaForLeave(params: {
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  days: number;
  paid: boolean;
  actorId: string;
  applicationId: string;
}): Promise<void> {
  if (!params.paid || params.days <= 0) return;
  await applyQuotaDelta({
    employeeId: params.employeeId,
    leaveTypeId: params.leaveTypeId,
    asOfDate: params.fromDate,
    delta: -params.days,
    reason: `Leave cancelled/restored (${params.days} day(s))`,
    actorId: params.actorId,
    relatedApplicationId: params.applicationId,
    consume: true,
  });
}

export async function applyDefaultQuotaPolicy(params: {
  employeeIds?: string[];
  department?: string;
  actorId: string;
}): Promise<{ updated: number }> {
  const settings = await getLeaveSettings();
  const filter: Record<string, unknown> = { isDeleted: { $ne: true }, status: 'Active' };
  if (params.employeeIds?.length) {
    filter._id = { $in: params.employeeIds.map((id) => new Types.ObjectId(id)) };
  }
  if (params.department) filter.department = params.department;

  const [employees, types] = await Promise.all([
    EmployeeModel.find(filter).select('_id joinDate').lean(),
    LeaveTypeModel.find({ active: true }).lean(),
  ]);

  let updated = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const emp of employees) {
    for (const lt of types) {
      const joinDate =
        emp.joinDate instanceof Date
          ? emp.joinDate.toISOString().slice(0, 10)
          : String(emp.joinDate).slice(0, 10);
      const { periodKey, periodType } = resolvePeriodKey(
        settings.policy,
        today,
        joinDate,
        settings.financialYearStartMonth
      );
      await LeaveQuotaModel.findOneAndUpdate(
        {
          employeeId: emp._id,
          leaveTypeId: lt._id,
          periodKey,
        },
        {
          $setOnInsert: {
            employeeId: emp._id,
            leaveTypeId: lt._id,
            periodKey,
            periodType,
            consumed: 0,
            manualAdjustment: 0,
          },
          $set: { entitled: lt.annualQuotaDefault ?? 0 },
        },
        { upsert: true }
      );
      updated += 1;
    }
  }

  return { updated };
}
