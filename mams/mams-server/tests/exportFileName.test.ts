import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EXPORT_NAMING,
  buildExportFileName,
  parseContentDispositionFilename,
} from '@mams/types';

describe('buildExportFileName', () => {
  it('builds daily CSV with default pattern', () => {
    const name = buildExportFileName(
      'dailyReportCsv',
      {
        department: 'Production',
        location: 'Surendranagar',
        startDate: '2026-03-14',
        endDate: '2026-03-20',
        companyName: 'Makson Pharmaceuticals',
      },
      DEFAULT_EXPORT_NAMING
    );
    expect(name).toBe(
      'MAKSONPHARMACEUTICAL_DailyAttendance_Production_Surendranagar_20260314-20260320.csv'
    );
  });

  it('uses AllDepts and AllLocations when filters are empty', () => {
    const name = buildExportFileName('dailyReportCsv', { startDate: '2026-03-14', endDate: '2026-03-20' }, {
      ...DEFAULT_EXPORT_NAMING,
      companyCode: 'MAKSON',
    });
    expect(name).toBe('MAKSON_DailyAttendance_AllDepts_AllLocations_20260314-20260320.csv');
  });

  it('formats dates as DDMMYY when configured', () => {
    const name = buildExportFileName(
      'dashboardAttendanceXlsx',
      { asOfDate: '2026-06-09', department: 'HR' },
      {
        ...DEFAULT_EXPORT_NAMING,
        companyCode: 'MAKSON',
        dateFormat: 'DDMMYY',
      }
    );
    expect(name).toBe('MAKSON_AttendanceExport_HR_090626.xlsx');
  });

  it('appends generated timestamp when enabled', () => {
    const name = buildExportFileName(
      'dailyReportCsv',
      {
        startDate: '2026-03-14',
        endDate: '2026-03-20',
        generatedAt: new Date('2026-03-20T15:30:00'),
      },
      {
        ...DEFAULT_EXPORT_NAMING,
        companyCode: 'MAKSON',
        includeGeneratedTimestamp: true,
      }
    );
    expect(name).toBe(
      'MAKSON_DailyAttendance_AllDepts_AllLocations_20260314-20260320_20260320_1530.csv'
    );
  });

  it('falls back to default pattern for invalid custom pattern', () => {
    const name = buildExportFileName(
      'dailyReportCsv',
      { startDate: '2026-03-14', endDate: '2026-03-20' },
      {
        ...DEFAULT_EXPORT_NAMING,
        companyCode: 'MAKSON',
        patterns: {
          ...DEFAULT_EXPORT_NAMING.patterns,
          dailyReportCsv: 'bad/path/{extension}',
        },
      }
    );
    expect(name).toBe('MAKSON_DailyAttendance_AllDepts_AllLocations_20260314-20260320.csv');
  });
});

describe('parseContentDispositionFilename', () => {
  it('parses quoted filename', () => {
    expect(parseContentDispositionFilename('attachment; filename="report.csv"')).toBe('report.csv');
  });

  it('parses UTF-8 filename', () => {
    expect(parseContentDispositionFilename("attachment; filename*=UTF-8''report%20name.csv")).toBe(
      'report name.csv'
    );
  });
});
