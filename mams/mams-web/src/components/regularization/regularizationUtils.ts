import type { RegularizationStatus, RegularizationType } from '@mams/types';
import { regularizationTypeNeedsIn, regularizationTypeNeedsOut } from '@mams/types';

export const REGULARIZATION_TYPE_LABELS: Record<RegularizationType, string> = {
  missed_in: 'Missed IN punch',
  missed_out: 'Missed OUT punch',
  missed_both: 'Missed both punches',
  wrong_punch: 'Wrong punch time',
  other: 'Other',
};

export function statusTone(status: RegularizationStatus): 'green' | 'red' | 'amber' {
  if (status === 'Approved') return 'green';
  if (status === 'Rejected') return 'red';
  return 'amber';
}

export function formatRequestedTimes(
  type: RegularizationType,
  requestedInTime: string | null,
  requestedOutTime: string | null
): string {
  const parts: string[] = [];
  if (regularizationTypeNeedsIn(type) && requestedInTime) parts.push(`IN ${requestedInTime}`);
  if (regularizationTypeNeedsOut(type) && requestedOutTime) parts.push(`OUT ${requestedOutTime}`);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export { regularizationTypeNeedsIn, regularizationTypeNeedsOut };
