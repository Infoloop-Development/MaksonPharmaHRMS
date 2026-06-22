import {
  AdminOverviewTableConfigSchema,
  DEFAULT_ADMIN_OVERVIEW_TABLE,
  type AdminOverviewTableConfig,
} from '@mams/types';
import { UserModel } from '../models/User.js';

export async function getAdminOverviewTableConfig(userId: string): Promise<AdminOverviewTableConfig> {
  const user = await UserModel.findById(userId).select('adminOverviewTable').lean();
  if (!user?.adminOverviewTable) {
    return DEFAULT_ADMIN_OVERVIEW_TABLE;
  }
  const parsed = AdminOverviewTableConfigSchema.safeParse(user.adminOverviewTable);
  return parsed.success ? parsed.data : DEFAULT_ADMIN_OVERVIEW_TABLE;
}

export async function saveAdminOverviewTableConfig(
  userId: string,
  config: AdminOverviewTableConfig
): Promise<AdminOverviewTableConfig> {
  const validated = AdminOverviewTableConfigSchema.parse(config);
  await UserModel.findByIdAndUpdate(userId, { adminOverviewTable: validated });
  return validated;
}
