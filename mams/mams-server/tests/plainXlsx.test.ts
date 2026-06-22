import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildPlainXlsxBuffer } from '../src/services/plainXlsx.service.js';

describe('buildPlainXlsxBuffer', () => {
  it('writes headers in row 1 and data from row 2', () => {
    const buffer = buildPlainXlsxBuffer(
      ['Code', 'Name'],
      [
        ['MKS0001', 'Alice'],
        ['MKS0002', 'Bob'],
      ],
      'Employees'
    );
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets.Employees;
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 });
    expect(rows[0]).toEqual(['Code', 'Name']);
    expect(rows[1]).toEqual(['MKS0001', 'Alice']);
    expect(rows[2]).toEqual(['MKS0002', 'Bob']);
  });
});
