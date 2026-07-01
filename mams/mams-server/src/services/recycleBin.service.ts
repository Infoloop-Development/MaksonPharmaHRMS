import { Types } from 'mongoose';
import {
  RECYCLE_BIN_RETENTION_DAYS,
  type RecycleBinEntityType,
  type RecycleBinItem,
  type RecycleBinListQuery,
  type RecycleBinListResponse,
  type BulkMutationResult,
} from '@mams/types';
import { EmployeeModel } from '../models/Employee.js';
import { DeviceModel } from '../models/Device.js';
import { HolidayModel } from '../models/Holiday.js';
import { VisitorFormModel } from '../models/VisitorForm.js';
import { UserModel } from '../models/User.js';
import { audit } from './audit.service.js';
import { clearSoftDeleteFields } from '../utils/softDelete.util.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function recycleBinRetentionCutoff(now = Date.now()): Date {
  return new Date(now - RECYCLE_BIN_RETENTION_DAYS * MS_PER_DAY);
}

function daysRemaining(deletedAt: Date | null | undefined): number {
  if (!deletedAt) return RECYCLE_BIN_RETENTION_DAYS;
  const elapsed = Date.now() - deletedAt.getTime();
  return Math.max(0, RECYCLE_BIN_RETENTION_DAYS - Math.floor(elapsed / MS_PER_DAY));
}

async function loadDeletedByMap(ids: Types.ObjectId[]): Promise<Map<string, { id: string; name: string }>> {
  const unique = [...new Set(ids.map(String))];
  if (unique.length === 0) return new Map();
  const users = await UserModel.find({ _id: { $in: unique } }).select('name').lean();
  const map = new Map<string, { id: string; name: string }>();
  for (const u of users) {
    map.set(String(u._id), { id: String(u._id), name: u.name });
  }
  return map;
}

function matchesSearch(name: string, identifier: string, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return name.toLowerCase().includes(q) || identifier.toLowerCase().includes(q);
}

async function fetchEmployeeItems(search?: string): Promise<RecycleBinItem[]> {
  const rows = await EmployeeModel.find({ isDeleted: true }).lean();
  const deletedByIds = rows.map((r) => r.deletedBy).filter(Boolean) as Types.ObjectId[];
  const byMap = await loadDeletedByMap(deletedByIds);
  return rows
    .filter((r) => matchesSearch(r.name, r.empCode, search ?? ''))
    .map((r) => ({
      id: String(r._id),
      entityType: 'employee' as const,
      name: r.name,
      identifier: r.empCode,
      deletedAt: (r.deletedAt ?? r.updatedAt ?? new Date()).toISOString(),
      deletedBy: r.deletedBy ? byMap.get(String(r.deletedBy)) ?? null : null,
      daysRemaining: daysRemaining(r.deletedAt),
    }));
}

async function fetchDeviceItems(search?: string): Promise<RecycleBinItem[]> {
  const rows = await DeviceModel.find({ isDeleted: true }).lean();
  const deletedByIds = rows.map((r) => r.deletedBy).filter(Boolean) as Types.ObjectId[];
  const byMap = await loadDeletedByMap(deletedByIds);
  return rows
    .filter((r) => matchesSearch(r.name, r.serialNumber, search ?? ''))
    .map((r) => ({
      id: String(r._id),
      entityType: 'device' as const,
      name: r.name,
      identifier: r.serialNumber,
      deletedAt: (r.deletedAt ?? r.updatedAt ?? new Date()).toISOString(),
      deletedBy: r.deletedBy ? byMap.get(String(r.deletedBy)) ?? null : null,
      daysRemaining: daysRemaining(r.deletedAt),
    }));
}

async function fetchHolidayItems(search?: string): Promise<RecycleBinItem[]> {
  const rows = await HolidayModel.find({ isDeleted: true }).lean();
  const deletedByIds = rows.map((r) => r.deletedBy).filter(Boolean) as Types.ObjectId[];
  const byMap = await loadDeletedByMap(deletedByIds);
  return rows
    .filter((r) => matchesSearch(r.name, r.date, search ?? ''))
    .map((r) => ({
      id: String(r._id),
      entityType: 'holiday' as const,
      name: r.name,
      identifier: r.date,
      deletedAt: (r.deletedAt ?? r.updatedAt ?? new Date()).toISOString(),
      deletedBy: r.deletedBy ? byMap.get(String(r.deletedBy)) ?? null : null,
      daysRemaining: daysRemaining(r.deletedAt),
    }));
}

async function fetchVisitorFormItems(search?: string): Promise<RecycleBinItem[]> {
  const rows = await VisitorFormModel.find({ isArchived: true }).lean();
  const deletedByIds = rows.map((r) => r.deletedBy).filter(Boolean) as Types.ObjectId[];
  const byMap = await loadDeletedByMap(deletedByIds);
  return rows
    .filter((r) => matchesSearch(r.title, r.publicSlug, search ?? ''))
    .map((r) => ({
      id: String(r._id),
      entityType: 'visitor_form' as const,
      name: r.title,
      identifier: r.publicSlug,
      deletedAt: (r.deletedAt ?? r.updatedAt ?? new Date()).toISOString(),
      deletedBy: r.deletedBy ? byMap.get(String(r.deletedBy)) ?? null : null,
      daysRemaining: daysRemaining(r.deletedAt),
    }));
}

async function fetchAllItems(entityType: RecycleBinEntityType | undefined, search?: string): Promise<RecycleBinItem[]> {
  if (entityType === 'employee') return fetchEmployeeItems(search);
  if (entityType === 'device') return fetchDeviceItems(search);
  if (entityType === 'holiday') return fetchHolidayItems(search);
  if (entityType === 'visitor_form') return fetchVisitorFormItems(search);

  const [employees, devices, holidays, forms] = await Promise.all([
    fetchEmployeeItems(search),
    fetchDeviceItems(search),
    fetchHolidayItems(search),
    fetchVisitorFormItems(search),
  ]);
  return [...employees, ...devices, ...holidays, ...forms];
}

export async function listRecycleBin(query: RecycleBinListQuery): Promise<RecycleBinListResponse> {
  const all = await fetchAllItems(query.entityType, query.search);
  all.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  const total = all.length;
  const start = (query.page - 1) * query.pageSize;
  const items = all.slice(start, start + query.pageSize);
  return { items, total, page: query.page, pageSize: query.pageSize };
}

async function restoreOne(entityType: RecycleBinEntityType, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid id');

  if (entityType === 'employee') {
    const doc = await EmployeeModel.findOne({ _id: id, isDeleted: true });
    if (!doc) throw new Error('Employee not found in recycle bin');
    const codeTaken = await EmployeeModel.findOne({
      _id: { $ne: doc._id },
      isDeleted: { $ne: true },
      empCode: doc.empCode,
    });
    if (codeTaken) throw new Error(`Employee code ${doc.empCode} is already in use`);
    const bioTaken = await EmployeeModel.findOne({
      _id: { $ne: doc._id },
      isDeleted: { $ne: true },
      biometricId: doc.biometricId,
    });
    if (bioTaken) throw new Error(`Biometric ID ${doc.biometricId} is already in use`);
    doc.isDeleted = false;
    doc.status = 'Active';
    doc.deletedAt = null;
    doc.deletedBy = null;
    await doc.save();
    return;
  }

  if (entityType === 'device') {
    const doc = await DeviceModel.findOne({ _id: id, isDeleted: true });
    if (!doc) throw new Error('Device not found in recycle bin');
    const serialTaken = await DeviceModel.findOne({
      _id: { $ne: doc._id },
      isDeleted: { $ne: true },
      serialNumber: doc.serialNumber,
    });
    if (serialTaken) throw new Error(`Serial number ${doc.serialNumber} is already registered`);
    doc.isDeleted = false;
    doc.isActive = true;
    Object.assign(doc, clearSoftDeleteFields());
    await doc.save();
    return;
  }

  if (entityType === 'holiday') {
    const doc = await HolidayModel.findOne({ _id: id, isDeleted: true });
    if (!doc) throw new Error('Holiday not found in recycle bin');
    doc.isDeleted = false;
    Object.assign(doc, clearSoftDeleteFields());
    await doc.save();
    return;
  }

  if (entityType === 'visitor_form') {
    const doc = await VisitorFormModel.findOne({ _id: id, isArchived: true });
    if (!doc) throw new Error('Visitor form not found in recycle bin');
    doc.isArchived = false;
    doc.isActive = true;
    Object.assign(doc, clearSoftDeleteFields());
    await doc.save();
    return;
  }
}

async function purgeOne(entityType: RecycleBinEntityType, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid id');

  if (entityType === 'employee') {
    const doc = await EmployeeModel.findOneAndDelete({ _id: id, isDeleted: true });
    if (!doc) throw new Error('Employee not found in recycle bin');
    return;
  }
  if (entityType === 'device') {
    const doc = await DeviceModel.findOneAndDelete({ _id: id, isDeleted: true });
    if (!doc) throw new Error('Device not found in recycle bin');
    return;
  }
  if (entityType === 'holiday') {
    const doc = await HolidayModel.findOneAndDelete({ _id: id, isDeleted: true });
    if (!doc) throw new Error('Holiday not found in recycle bin');
    return;
  }
  if (entityType === 'visitor_form') {
    const doc = await VisitorFormModel.findOneAndDelete({ _id: id, isArchived: true });
    if (!doc) throw new Error('Visitor form not found in recycle bin');
    return;
  }
}

const RESTORE_AUDIT: Record<RecycleBinEntityType, string> = {
  employee: 'employee_restored',
  device: 'device_restored',
  holiday: 'holiday_restored',
  visitor_form: 'visitor_form_restored',
};

export async function bulkRestoreRecycleBin(
  items: Array<{ entityType: RecycleBinEntityType; id: string }>,
  ctx: { userId: string; ipAddress?: string | null; userAgent?: string | null }
): Promise<BulkMutationResult> {
  const result: BulkMutationResult = { succeeded: 0, skipped: 0, errors: [] };
  for (const item of items) {
    try {
      await restoreOne(item.entityType, item.id);
      await audit(RESTORE_AUDIT[item.entityType], ctx, {
        entityType: item.entityType,
        entityId: item.id,
        payload: { restored: true },
      });
      result.succeeded += 1;
    } catch (e: unknown) {
      result.skipped += 1;
      result.errors.push({ id: item.id, reason: e instanceof Error ? e.message : 'Restore failed' });
    }
  }
  return result;
}

export async function bulkPurgeRecycleBin(
  items: Array<{ entityType: RecycleBinEntityType; id: string }>,
  ctx: { userId: string; ipAddress?: string | null; userAgent?: string | null }
): Promise<BulkMutationResult> {
  const result: BulkMutationResult = { succeeded: 0, skipped: 0, errors: [] };
  for (const item of items) {
    try {
      await purgeOne(item.entityType, item.id);
      await audit('recycle_bin_purged', ctx, {
        entityType: item.entityType,
        entityId: item.id,
        payload: { permanent: true },
      });
      result.succeeded += 1;
    } catch (e: unknown) {
      result.skipped += 1;
      result.errors.push({ id: item.id, reason: e instanceof Error ? e.message : 'Purge failed' });
    }
  }
  return result;
}

export async function purgeExpiredRecycleBinItems(): Promise<Record<RecycleBinEntityType, number>> {
  const cutoff = recycleBinRetentionCutoff();
  const counts: Record<RecycleBinEntityType, number> = {
    employee: 0,
    device: 0,
    holiday: 0,
    visitor_form: 0,
  };

  const [emp, dev, hol, forms] = await Promise.all([
    EmployeeModel.deleteMany({ isDeleted: true, deletedAt: { $lte: cutoff } }),
    DeviceModel.deleteMany({ isDeleted: true, deletedAt: { $lte: cutoff } }),
    HolidayModel.deleteMany({ isDeleted: true, deletedAt: { $lte: cutoff } }),
    VisitorFormModel.deleteMany({ isArchived: true, deletedAt: { $lte: cutoff } }),
  ]);

  counts.employee = emp.deletedCount ?? 0;
  counts.device = dev.deletedCount ?? 0;
  counts.holiday = hol.deletedCount ?? 0;
  counts.visitor_form = forms.deletedCount ?? 0;

  return counts;
}
