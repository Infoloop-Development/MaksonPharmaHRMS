import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  buildComplianceMonthlyReportXlsx,
} from '../src/services/complianceMonthlyReport.service.js';

describe('buildComplianceMonthlyReportXlsx', () => {
  it('builds summary and daily sheets with leave rows when hours below baseline', () => {
    const buffer = buildComplianceMonthlyReportXlsx({
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
});
