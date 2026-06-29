import type { LeaveStatus } from '@mams/types';
import type { LeaveApplicationItem } from '../../api/leave';
import { EMPTY_CELL } from '../../lib/format';

export type LeaveTab = 'requests' | 'holidays' | 'settings';

export function employeeInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function leaveStatusTone(s: LeaveStatus): 'amber' | 'green' | 'red' | 'gray' {
  if (s === 'Pending') return 'amber';
  if (s === 'Approved') return 'green';
  if (s === 'Rejected') return 'red';
  return 'gray';
}

export function leaveTypeLabel(item: LeaveApplicationItem) {
  const lt = item.leaveTypeId;
  if (!lt) return EMPTY_CELL;
  if (item.halfDayPortion) {
    const half = item.halfDayPortion === 'first' ? 'First Half' : 'Second Half';
    return `${lt.name}: Half Day (${half})`;
  }
  return lt.name;
}

export function calendarDaySpan(from: string, to: string): number {
  if (!from || !to || from > to) return 0;
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}
