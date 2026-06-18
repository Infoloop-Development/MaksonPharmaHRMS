import {
  AdminOverviewKpiConfigSchema,
  DEFAULT_ADMIN_OVERVIEW_KPI,
  type AdminOverviewKpiConfig,
} from '@mams/types';
import { UserModel } from '../models/User.js';

export async function getAdminOverviewKpi(userId: string): Promise<AdminOverviewKpiConfig> {
  const user = await UserModel.findById(userId).select('adminOverviewKpi').lean();
  if (!user?.adminOverviewKpi?.slots?.length) {
    return DEFAULT_ADMIN_OVERVIEW_KPI;
  }
  const parsed = AdminOverviewKpiConfigSchema.safeParse(user.adminOverviewKpi);
  return parsed.success ? parsed.data : DEFAULT_ADMIN_OVERVIEW_KPI;
}

export async function saveAdminOverviewKpi(
  userId: string,
  config: AdminOverviewKpiConfig
): Promise<AdminOverviewKpiConfig> {
  const validated = AdminOverviewKpiConfigSchema.parse(config);
  await UserModel.findByIdAndUpdate(userId, { adminOverviewKpi: validated });
  return validated;
}
