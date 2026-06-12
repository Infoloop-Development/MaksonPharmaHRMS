import { describe, expect, it } from 'vitest';
import { validateVisitorResponses, type VisitorField } from '@mams/types';

const baseFields: VisitorField[] = [
  { id: 'name', type: 'short_text', label: 'Name', required: true, order: 0 },
  { id: 'email', type: 'email', label: 'Email', required: true, order: 1 },
  { id: 'photo', type: 'file', label: 'Photo', required: false, order: 2 },
];

describe('validateVisitorResponses', () => {
  it('requires required text fields', () => {
    const r = validateVisitorResponses(baseFields, { name: '', email: 'a@b.com' }, new Set());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.name).toBeTruthy();
  });

  it('validates email format', () => {
    const r = validateVisitorResponses(baseFields, { name: 'Jane', email: 'not-email' }, new Set());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.email).toBeTruthy();
  });

  it('accepts file via fileFieldIds for required file', () => {
    const fields: VisitorField[] = [{ id: 'id', type: 'file', label: 'ID', required: true, order: 0 }];
    const r = validateVisitorResponses(fields, {}, new Set(['id']));
    expect(r.ok).toBe(true);
  });

  it('passes valid submission', () => {
    const r = validateVisitorResponses(
      baseFields,
      { name: 'Jane Doe', email: 'jane@example.com' },
      new Set()
    );
    expect(r.ok).toBe(true);
  });
});
