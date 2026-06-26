import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { BASELINE_HOURS } from '@mams/types';
import {
  buildFinancialReportXlsx,
  computeFinancialReportRow,
  financialReportFilename,
} from '../src/services/complianceFinancialReport.service.js';

describe('computeFinancialReportRow', () => {
  it('splits 312 real hours into 208 cheque and 104 cash', () => {
    const row = computeFinancialReportRow('Prem Mehta', 208, 312);
    expect(row).toEqual({
      name: 'Prem Mehta',
      complianceHours: 208,
      realHours: 312,
      complianceChequePayment: 208,
      paymentInCash: 104,
    });
  });

  it('caps compliance hours at baseline when raw sum exceeds 208', () => {
    const row = computeFinancialReportRow('Alice', 250, 200);
    expect(row.complianceHours).toBe(BASELINE_HOURS);
    expect(row.complianceChequePayment).toBe(200);
    expect(row.paymentInCash).toBe(0);
  });

  it('uses partial cheque when real hours are below baseline', () => {
    const row = computeFinancialReportRow('Bob', 160, 160);
    expect(row).toEqual({
      name: 'Bob',
      complianceHours: 160,
      realHours: 160,
      complianceChequePayment: 160,
      paymentInCash: 0,
    });
  });

  it('returns zero cash when real hours equal baseline', () => {
    const row = computeFinancialReportRow('Carol', 208, 208);
    expect(row.paymentInCash).toBe(0);
    expect(row.complianceChequePayment).toBe(BASELINE_HOURS);
  });
});

describe('buildFinancialReportXlsx', () => {
  it('writes five columns with expected headers', () => {
    const buffer = buildFinancialReportXlsx([
      computeFinancialReportRow('Prem Mehta', 208, 312),
    ]);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Financial Report']);
    const sheet = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets['Financial Report']!, {
      header: 1,
    });
    expect(sheet[0]).toEqual([
      'Name',
      'Compliance Hours',
      'Real Hours',
      'Compliance cheque payment',
      'Payment in cash',
    ]);
    expect(sheet[1]).toEqual(['Prem Mehta', 208, 312, 208, 104]);
  });
});

describe('financialReportFilename', () => {
  it('includes year-month', () => {
    expect(financialReportFilename('2026-05')).toBe('financial-report-2026-05.xlsx');
  });
});
