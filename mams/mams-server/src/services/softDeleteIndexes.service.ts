import { EmployeeModel } from '../models/Employee.js';
import { DeviceModel } from '../models/Device.js';
import { logger } from '../utils/logger.js';

/** Ensures partial unique indexes exist so soft-deleted rows do not block re-registration. */
export async function syncSoftDeleteIndexes(): Promise<void> {
  try {
    await EmployeeModel.collection.dropIndex('empCode_1').catch(() => undefined);
    await EmployeeModel.collection.dropIndex('biometricId_1').catch(() => undefined);
    await DeviceModel.collection.dropIndex('serialNumber_1').catch(() => undefined);
  } catch {
    // index may not exist
  }

  await EmployeeModel.syncIndexes();
  await DeviceModel.syncIndexes();
  logger.info('soft_delete_indexes_synced');
}
