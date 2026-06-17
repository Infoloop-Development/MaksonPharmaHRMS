import {
  DEFAULT_DASHBOARD_LAYOUT,
  DashboardLayoutSchema,
  migrateDashboardLayout,
  type DashboardLayout,
} from '@mams/types';
import { UserModel } from '../models/User.js';

export async function getAdminOverviewLayout(userId: string): Promise<DashboardLayout> {
  const user = await UserModel.findById(userId).select('adminOverviewLayout').lean();
  if (!user?.adminOverviewLayout) {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
  return migrateDashboardLayout(user.adminOverviewLayout);
}

export async function saveAdminOverviewLayout(
  userId: string,
  layout: DashboardLayout
): Promise<DashboardLayout> {
  const validated = DashboardLayoutSchema.parse(layout);
  await UserModel.findByIdAndUpdate(userId, { adminOverviewLayout: validated });
  return validated;
}
