import type { RegularizationStatus, RegularizationType, TimeFormat } from '@mams/types';
import { regularizationTypeNeedsIn, regularizationTypeNeedsOut } from '@mams/types';
import { formatHhmm } from '../../lib/timeFormat';
import { EMPTY_CELL } from '../../lib/format';

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
  requestedOutTime: string | null,
  format: TimeFormat = '12h'
): string {
  const parts: string[] = [];
  if (regularizationTypeNeedsIn(type) && requestedInTime) parts.push(`IN ${formatHhmm(requestedInTime, format)}`);
  if (regularizationTypeNeedsOut(type) && requestedOutTime) parts.push(`OUT ${formatHhmm(requestedOutTime, format)}`);
  return parts.length > 0 ? parts.join(' · ') : EMPTY_CELL;
}

export { regularizationTypeNeedsIn, regularizationTypeNeedsOut };
