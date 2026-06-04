import { EmployeeModel } from '../models/Employee.js';
import { SettingsModel } from '../models/Settings.js';
import { ApiError } from '../middleware/error.js';

function formatEmpCode(n: number): string {
  if (n < 1 || n > 9999) {
    throw new ApiError(400, 'emp_code_exhausted', 'Employee code must be between MKS0001 and MKS9999');
  }
  return `MKS${String(n).padStart(4, '0')}`;
}

/** Read-only: next code that would be issued (no increment). */
export async function previewNextEmpCode(): Promise<string> {
  const count = await EmployeeModel.countDocuments({ isDeleted: { $ne: true } });
  let doc = await SettingsModel.findOne();
  if (!doc) doc = await SettingsModel.create({});
  const seq = doc.employeeCodeSequence ?? 0;
  if (count === 0) return formatEmpCode(1);
  return formatEmpCode(seq + 1);
}

/** Atomically allocate next employee code (monotonic; resets to MKS0001 when no employees remain). */
export async function allocateNextEmpCode(): Promise<string> {
  const count = await EmployeeModel.countDocuments({ isDeleted: { $ne: true } });
  if (count === 0) {
    await SettingsModel.updateOne({}, { $set: { employeeCodeSequence: 0 } });
  }
  const updated = await SettingsModel.findOneAndUpdate(
    {},
    { $inc: { employeeCodeSequence: 1 } },
    { new: true, upsert: true }
  );
  const n = updated?.employeeCodeSequence ?? 1;
  return formatEmpCode(n);
}

/**
 * After bulk CSV import (or manual DB edits), keep `employeeCodeSequence` at least as high as
 * the highest numeric suffix among active `MKS####` codes so modal preview and allocation stay collision-safe.
 */
export async function syncEmployeeCodeSequenceFromDb(): Promise<void> {
  const agg = await EmployeeModel.aggregate<{ maxSuffix: number }>([
    { $match: { empCode: { $regex: /^MKS[0-9]{4}$/ }, isDeleted: { $ne: true } } },
    { $project: { suffix: { $toInt: { $substrCP: ['$empCode', 3, 4] } } } },
    { $group: { _id: null, maxSuffix: { $max: '$suffix' } } },
  ]);
  const maxFromDb = agg[0]?.maxSuffix ?? 0;
  let doc = await SettingsModel.findOne();
  if (!doc) doc = await SettingsModel.create({});
  const cur = doc.employeeCodeSequence ?? 0;
  const next = Math.max(cur, maxFromDb);
  if (next > cur) {
    await SettingsModel.updateOne({}, { $set: { employeeCodeSequence: next } });
  }
}
