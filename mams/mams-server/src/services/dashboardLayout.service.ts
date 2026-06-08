import {
  DEFAULT_DASHBOARD_LAYOUT,
  DashboardLayoutSchema,
  migrateDashboardLayout,
  type DashboardLayout,
} from '@mams/types';
import { UserModel } from '../models/User.js';

export async function getDashboardLayout(userId: string): Promise<DashboardLayout> {
  const user = await UserModel.findById(userId).select('dashboardLayout').lean();
  if (!user?.dashboardLayout) {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
  return migrateDashboardLayout(user.dashboardLayout);
}

export async function saveDashboardLayout(
  userId: string,
  layout: DashboardLayout
): Promise<DashboardLayout> {
  const validated = DashboardLayoutSchema.parse(layout);
  await UserModel.findByIdAndUpdate(userId, { dashboardLayout: validated });
  return validated;
}
