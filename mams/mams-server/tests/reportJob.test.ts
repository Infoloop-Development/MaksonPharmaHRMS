import { describe, it, expect } from 'vitest';
import { CreateReportJobBodySchema } from '@mams/types';
import { REPORT_TOO_LARGE_EMPLOYEES, REPORT_GENERATION_FAILED_MESSAGE } from '../src/services/reportJob.service.js';

describe('CreateReportJobBodySchema', () => {
  it('parses compliance monthly job body', () => {
    const body = CreateReportJobBodySchema.parse({
      type: 'compliance_monthly',
      yearMonth: '2026-05',
      overrides: [{ employeeId: 'abc', totalHours: 208 }],
    });
    expect(body.type).toBe('compliance_monthly');
    if (body.type === 'compliance_monthly') {
      expect(body.overrides).toHaveLength(1);
    }
  });

  it('parses financial job body', () => {
    const body = CreateReportJobBodySchema.parse({
      type: 'financial',
      yearMonth: '2026-05',
    });
    expect(body.type).toBe('financial');
  });

  it('rejects invalid yearMonth', () => {
    expect(() =>
      CreateReportJobBodySchema.parse({
        type: 'financial',
        yearMonth: '2026-5',
      })
    ).toThrow();
  });
});

describe('report job constants', () => {
  it('exposes employee cap and failure message for large reports', () => {
    expect(REPORT_TOO_LARGE_EMPLOYEES).toBe(3000);
    expect(REPORT_GENERATION_FAILED_MESSAGE).toContain('timeout');
  });
});
