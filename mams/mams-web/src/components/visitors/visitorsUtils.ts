import type { VisitorFieldType, VisitorRequestStatus } from '@mams/types';
import { EMPTY_CELL } from '../../lib/format';

export type VisitorTab = 'requests' | 'forms';

export function visitorStatusTone(status: VisitorRequestStatus): 'amber' | 'green' | 'red' {
  if (status === 'Pending') return 'amber';
  if (status === 'Approved') return 'green';
  return 'red';
}

export function formatVisitorResponse(
  value: string | string[] | null | undefined
): string {
  if (value === null || value === undefined || value === '') return EMPTY_CELL;
  if (Array.isArray(value)) return value.length ? value.join(', ') : EMPTY_CELL;
  return String(value);
}

export function newFieldId(): string {
  return crypto.randomUUID();
}

export function createEmptyField(type: VisitorFieldType, order: number) {
  return {
    id: newFieldId(),
    type,
    label: 'Untitled field',
    required: false,
    order,
    options: type === 'dropdown' || type === 'radio' || type === 'checkbox' ? ['Option 1'] : undefined,
  };
}

export const AUDIT_EVENT_LABELS: Record<string, string> = {
  visitor_request_submitted: 'Request submitted',
  visitor_request_approved: 'Approved',
  visitor_request_rejected: 'Rejected',
  visitor_form_created: 'Form created',
  visitor_form_updated: 'Form updated',
  visitor_form_slug_regenerated: 'Public link regenerated',
};
