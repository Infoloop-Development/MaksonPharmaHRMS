import {
  AdminOverviewWidgetsConfigSchema,
  DEFAULT_ADMIN_OVERVIEW_WIDGETS,
  migrateAdminOverviewWidgets,
  type AdminOverviewWidgetsConfig,
} from '@mams/types';
import { UserModel } from '../models/User.js';

export async function getAdminOverviewWidgets(userId: string): Promise<AdminOverviewWidgetsConfig> {
  const user = await UserModel.findById(userId).select('adminOverviewWidgets adminOverviewLayout').lean();
  if (user?.adminOverviewWidgets?.widgets?.length) {
    const parsed = AdminOverviewWidgetsConfigSchema.safeParse(user.adminOverviewWidgets);
    if (parsed.success) return parsed.data;
  }
  if (user?.adminOverviewLayout) {
    return migrateAdminOverviewWidgets(user.adminOverviewLayout);
  }
  return DEFAULT_ADMIN_OVERVIEW_WIDGETS;
}

export async function saveAdminOverviewWidgets(
  userId: string,
  config: AdminOverviewWidgetsConfig
): Promise<AdminOverviewWidgetsConfig> {
  const validated = AdminOverviewWidgetsConfigSchema.parse(config);
  await UserModel.findByIdAndUpdate(userId, { adminOverviewWidgets: validated });
  return validated;
}
