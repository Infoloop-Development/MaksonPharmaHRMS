import { Types } from 'mongoose';
import { LeaveApplicationModel } from '../../models/LeaveApplication.js';

export async function hasOverlappingLeave(
  employeeId: string,
  fromDate: string,
  toDate: string,
  excludeId?: string
): Promise<boolean> {
  const filter: Record<string, unknown> = {
    employeeId: new Types.ObjectId(employeeId),
    status: { $in: ['Pending', 'Approved'] },
    fromDate: { $lte: toDate },
    toDate: { $gte: fromDate },
  };
  if (excludeId && Types.ObjectId.isValid(excludeId)) {
    filter._id = { $ne: new Types.ObjectId(excludeId) };
  }
  const exists = await LeaveApplicationModel.exists(filter);
  return Boolean(exists);
}
