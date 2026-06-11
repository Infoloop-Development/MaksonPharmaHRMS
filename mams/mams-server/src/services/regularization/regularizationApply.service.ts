import type { Types } from 'mongoose';
import type { RegularizationType } from '@mams/types';
import { regularizationTypeNeedsIn, regularizationTypeNeedsOut } from '@mams/types';
import { AttendanceRawModel } from '../../models/AttendanceRaw.js';
import { EmployeeModel } from '../../models/Employee.js';
import { RegularizationRequestModel } from '../../models/RegularizationRequest.js';
import type { RegularizationRequestDoc } from '../../models/RegularizationRequest.js';
import { ApiError } from '../../middleware/error.js';
import { recomputeDerived } from '../attendance.service.js';
import { istStringToUtc, utcToIstTimeString } from '../../utils/time.js';

export interface PunchInsertSpec {
  punchType: 'IN' | 'OUT';
  rawTimestamp: Date;
  idempotencyKey: string;
}

export function buildPunchInsertSpecs(
  requestId: string,
  date: string,
  type: RegularizationType,
  requestedInTime?: string | null,
  requestedOutTime?: string | null
): PunchInsertSpec[] {
  const specs: PunchInsertSpec[] = [];
  if (regularizationTypeNeedsIn(type) && requestedInTime) {
    specs.push({
      punchType: 'IN',
      rawTimestamp: istStringToUtc(`${date} ${requestedInTime}:00`),
      idempotencyKey: `reg:${requestId}:in`,
    });
  }
  if (regularizationTypeNeedsOut(type) && requestedOutTime) {
    specs.push({
      punchType: 'OUT',
      rawTimestamp: istStringToUtc(`${date} ${requestedOutTime}:00`),
      idempotencyKey: `reg:${requestId}:out`,
    });
  }
  return specs;
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000;
}

export async function assertNoDuplicatePending(
  employeeId: Types.ObjectId | string,
  date: string,
  excludeId?: Types.ObjectId | string
): Promise<void> {
  const filter: Record<string, unknown> = { employeeId, date, status: 'Pending' };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await RegularizationRequestModel.exists(filter);
  if (existing) {
    throw new ApiError(
      409,
      'duplicate_pending',
      'A pending regularization request already exists for this employee and date'
    );
  }
}

export async function applyRegularizationApproval(doc: RegularizationRequestDoc): Promise<Types.ObjectId[]> {
  const employee = await EmployeeModel.findById(doc.employeeId);
  if (!employee) throw new ApiError(404, 'not_found', 'Employee not found');

  const requestId = String(doc._id);
  const specs = buildPunchInsertSpecs(
    requestId,
    doc.date,
    doc.type as RegularizationType,
    doc.requestedInTime,
    doc.requestedOutTime
  );
  if (specs.length === 0) {
    throw new ApiError(400, 'invalid_request', 'No punch times to apply for this regularization type');
  }

  const appliedRawIds: Types.ObjectId[] = [];
  const now = new Date();

  for (const spec of specs) {
    try {
      const raw = await AttendanceRawModel.create({
        employeeId: doc.employeeId,
        biometricId: employee.biometricId,
        deviceId: null,
        punchType: spec.punchType,
        rawTimestamp: spec.rawTimestamp,
        rawDate: doc.date,
        rawPayload: { source: 'regularization', regularizationRequestId: requestId },
        receivedAt: now,
        sourceIp: null,
        vendor: 'eSSL',
        idempotencyKey: spec.idempotencyKey,
      });
      appliedRawIds.push(raw._id);
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        const existing = await AttendanceRawModel.findOne({ idempotencyKey: spec.idempotencyKey });
        if (existing) appliedRawIds.push(existing._id);
        else throw err;
      } else {
        throw err;
      }
    }
  }

  await recomputeDerived(doc.employeeId, doc.date, 'regularization_applied');
  return appliedRawIds;
}

/** Format existing raw punch times as HH:mm for preview panel. */
export function formatRawPunchTime(rawTimestamp: Date): string {
  return utcToIstTimeString(rawTimestamp).slice(0, 5);
}
