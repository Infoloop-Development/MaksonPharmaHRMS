import type { Role } from '@mams/types';
import type { NavIconName } from '../components/navIcons';

export type MobileBottomTab = {
  to: string;
  label: string;
  shortLabel?: string;
  icon: NavIconName;
  end?: boolean;
  center?: boolean;
};

export function mobileBottomNavTabs(role: Role | undefined): MobileBottomTab[] | null {
  if (role === 'org.admin') {
    return [
      {
        to: '/compliance-attendance',
        label: 'Compliance Attendance',
        shortLabel: 'Compliance',
        icon: 'compliance',
      },
      { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', end: true, center: true },
      {
        to: '/attendance',
        label: 'Attendance Log',
        shortLabel: 'Attendance',
        icon: 'attendance',
        end: true,
      },
    ];
  }
  return null;
}

export function hasMobileBottomNav(role: Role | undefined): boolean {
  return mobileBottomNavTabs(role) !== null;
}
