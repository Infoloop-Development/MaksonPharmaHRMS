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

  it('returns branded XLSX with company header rows and data', async () => {
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
    expect(rows[0]).toEqual(['Company', 'Makson Pharmaceuticals']);
    expect(rows.some((r) => r[0] === 'Report Type' && r[1] === 'Admin Overview Users')).toBe(true);
    const headerRow = rows.find((r) => r[0] === 'Name');
    expect(headerRow).toEqual(['Name', 'Email', 'Role']);
    expect(rows.some((r) => r[0] === 'Jane Doe')).toBe(true);
    expect(rows.some((r) => r[0] === 'Confidential employee data')).toBe(true);
  });
});
