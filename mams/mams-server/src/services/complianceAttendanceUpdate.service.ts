import { Types } from 'mongoose';
import type { ComplianceShift } from '@mams/types';
import { ComplianceGeneratedAttendanceModel } from '../models/ComplianceGeneratedAttendance.js';
import { audit } from './audit.service.js';
import { utcToIstDateString } from '../utils/time.js';
import { ApiError } from '../middleware/error.js';

export interface ComplianceAttendanceUpdateInput {
  checkInAt?: string;
  checkOutAt?: string;
  hoursWorked?: number;
  alternateShift?: ComplianceShift;
  adjustmentNote: string;
}

function recomputeCheckOutNextDay(checkInAt: Date, checkOutAt: Date): boolean {
  return utcToIstDateString(checkOutAt) > utcToIstDateString(checkInAt);
}

function hoursBetween(checkInAt: Date, checkOutAt: Date): number {
  const ms = checkOutAt.getTime() - checkInAt.getTime();
  if (ms < 0) return 0;
  return Math.round((ms / 3_600_000) * 100) / 100;
}

export async function updateComplianceGeneratedAttendance(
  id: string,
  input: ComplianceAttendanceUpdateInput,
  actor: { userId: string; ipAddress: string | null }
) {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(404, 'not_found', 'Compliance record not found');
  }

  const doc = await ComplianceGeneratedAttendanceModel.findById(id);
  if (!doc) {
    throw new ApiError(404, 'not_found', 'Compliance record not found');
  }

  const before = {
    checkInAt: doc.checkInAt,
    checkOutAt: doc.checkOutAt,
    checkOutNextDay: doc.checkOutNextDay,
    hoursWorked: doc.hoursWorked,
    alternateShift: doc.alternateShift,
  };

  if (input.checkInAt !== undefined) {
    const d = new Date(input.checkInAt);
    if (Number.isNaN(d.getTime())) {
      throw new ApiError(400, 'invalid_check_in', 'Invalid checkInAt');
    }
    doc.checkInAt = d;
  }
  if (input.checkOutAt !== undefined) {
    const d = new Date(input.checkOutAt);
    if (Number.isNaN(d.getTime())) {
      throw new ApiError(400, 'invalid_check_out', 'Invalid checkOutAt');
    }
    doc.checkOutAt = d;
  }
  if (input.alternateShift !== undefined) {
    doc.alternateShift = input.alternateShift;
  }

  if (input.checkInAt !== undefined || input.checkOutAt !== undefined) {
    doc.checkOutNextDay = recomputeCheckOutNextDay(doc.checkInAt, doc.checkOutAt);
    if (input.hoursWorked === undefined) {
      doc.hoursWorked = hoursBetween(doc.checkInAt, doc.checkOutAt);
    }
  }

  if (input.hoursWorked !== undefined) {
    if (!Number.isFinite(input.hoursWorked) || input.hoursWorked < 0) {
      throw new ApiError(400, 'invalid_hours', 'hoursWorked must be a non-negative number');
    }
    doc.hoursWorked = input.hoursWorked;
  }

  await doc.save();

  await audit(
    'compliance_record_adjusted',
    { userId: actor.userId, ipAddress: actor.ipAddress },
    {
      entityType: 'compliance_attendance',
      entityId: doc._id,
      payload: {
        employeeId: String(doc.employeeId),
        date: doc.date,
        adjustmentNote: input.adjustmentNote,
        before,
        after: {
          checkInAt: doc.checkInAt,
          checkOutAt: doc.checkOutAt,
          checkOutNextDay: doc.checkOutNextDay,
          hoursWorked: doc.hoursWorked,
          alternateShift: doc.alternateShift,
        },
      },
    }
  );

  const populated = await ComplianceGeneratedAttendanceModel.findById(doc._id)
    .populate('employeeId', 'name empCode department alternateShift')
    .lean();

  return populated;
}
