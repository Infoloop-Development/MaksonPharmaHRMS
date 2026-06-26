import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { BASELINE_HOURS } from '@mams/types';
import {
  buildComplianceMonthlyReportXlsx,
  normalizeComplianceShift,
} from '../src/services/complianceMonthlyReport.service.js';

describe('normalizeComplianceShift', () => {
  it('returns valid shifts unchanged', () => {
    expect(normalizeComplianceShift('A')).toBe('A');
    expect(normalizeComplianceShift('B')).toBe('B');
    expect(normalizeComplianceShift('C')).toBe('C');
  });

  it('defaults invalid shift to A', () => {
    expect(normalizeComplianceShift('')).toBe('A');
    expect(normalizeComplianceShift('X')).toBe('A');
  });
});

describe('buildComplianceMonthlyReportXlsx', () => {
  it('builds summary and daily sheets with leave rows when hours below baseline', async () => {
    const buffer = await buildComplianceMonthlyReportXlsx({
      yearMonth: '2026-05',
      employees: [
        {
          employeeId: 'emp1',
          empCode: 'MKS0001',
          name: 'Alice',
          department: 'HR',
          alternateShift: 'A',
          totalHours: 160,
        },
      ],
    });
    const wb = XLSX.read(buffer, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Summary', 'Daily']);
    const summary = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets.Summary!, { header: 1 });
    expect(summary[0]).toContain('Leave Days');
    expect(summary[1]?.[7]).toBeGreaterThan(0);

    const daily = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets.Daily!, { header: 1 });
    const statuses = daily.slice(1).map((row) => row[6]);
    expect(statuses).toContain('Leave');
    expect(statuses).toContain('Present');
    expect(statuses).toContain('Weekly Off');
  });

  it('builds valid xlsx for 100 employees without throwing', async () => {
    const employees = Array.from({ length: 100 }, (_, i) => ({
      employeeId: `emp-${i}`,
      empCode: `MKS${String(i).padStart(4, '0')}`,
      name: `Employee ${i}`,
      department: 'Dept',
      alternateShift: (['A', 'B', 'C'] as const)[i % 3]!,
      totalHours: BASELINE_HOURS,
    }));
    const buffer = await buildComplianceMonthlyReportXlsx({
      yearMonth: '2026-05',
      employees,
    });
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const summary = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets.Summary!, { header: 1 });
    expect(summary.length).toBe(101);
    const daily = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets.Daily!, { header: 1 });
    expect(daily.length).toBeGreaterThan(100);
  });

  it('handles invalid alternateShift via normalization', async () => {
    const buffer = await buildComplianceMonthlyReportXlsx({
      yearMonth: '2026-05',
      employees: [
        {
          employeeId: 'emp-bad',
          empCode: 'MKS9999',
          name: 'Bad Shift',
          department: 'HR',
          alternateShift: 'X' as 'A',
          totalHours: BASELINE_HOURS,
        },
      ],
    });
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const summary = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets.Summary!, { header: 1 });
    expect(summary[1]?.[3]).toBe('Morning');
  });
});
