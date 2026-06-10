import {
  DEFAULT_DASHBOARD_KPI,
  DashboardKpiConfigSchema,
  type DashboardKpiConfig,
} from '@mams/types';
import { UserModel } from '../models/User.js';

export async function getDashboardKpi(userId: string): Promise<DashboardKpiConfig> {
  const user = await UserModel.findById(userId).select('dashboardKpi').lean();
  if (!user?.dashboardKpi?.slots?.length) {
    return DEFAULT_DASHBOARD_KPI;
  }
  const parsed = DashboardKpiConfigSchema.safeParse(user.dashboardKpi);
  return parsed.success ? parsed.data : DEFAULT_DASHBOARD_KPI;
}

export async function saveDashboardKpi(
  userId: string,
  config: DashboardKpiConfig
): Promise<DashboardKpiConfig> {
  const validated = DashboardKpiConfigSchema.parse(config);
  await UserModel.findByIdAndUpdate(userId, { dashboardKpi: validated });
  return validated;
}
