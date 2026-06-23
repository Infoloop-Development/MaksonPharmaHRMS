import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';

const listUsers = vi.fn();

vi.mock('../src/models/Settings.js', () => ({
  SettingsModel: {
    findOne: () => ({
      lean: async () => ({
        companyName: 'Makson Pharmaceuticals',
        registeredAddress: 'Surendranagar, Gujarat',
        signatoryName: 'Komal Makasana',
        signatoryDesignation: 'CFO & Partner',
        confidentialityNoticeEnabled: true,
        confidentialityNoticeText: 'Confidential employee data',
        exportNaming: {
          companyCode: 'MAKSON',
          dateFormat: 'DDMMYY',
        },
      }),
    }),
  },
}));

vi.mock('../src/services/adminOverview.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/adminOverview.service.js')>();
  return {
    ...actual,
    listAdminOverviewUsers: (...args: unknown[]) => listUsers(...args),
  };
});

const { exportAdminOverviewTableXlsx } = await import(
  '../src/services/adminOverviewExport.service.js'
);

describe('exportAdminOverviewTableXlsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listUsers.mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'org.admin',
          active: true,
          lastLogin: null,
        },
      ],
      total: 1,
    });
  });

  it('returns plain XLSX with column headers in row 1 and data rows only', async () => {
    const { buffer, filename } = await exportAdminOverviewTableXlsx(
      'users',
      { columns: 'name,email,role' },
      'real'
    );

    expect(filename).toMatch(/\.xlsx$/i);
    expect(filename).toContain('MAKSON');

    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets.Data;
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 });
    expect(rows[0]).toEqual(['Name', 'Email', 'Role']);
    expect(rows[1]).toEqual(['Jane Doe', 'jane@example.com', 'org.admin']);
    expect(rows.some((r) => r[0] === 'Company')).toBe(false);
    expect(rows.some((r) => r[0] === 'Confidential employee data')).toBe(false);
  });
});
