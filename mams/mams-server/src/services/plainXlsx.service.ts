import * as XLSX from 'xlsx';

export const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function buildPlainXlsxBuffer(
  headers: string[],
  rows: (string | number)[][],
  sheetName = 'Export'
): Buffer {
  const sheetAoA: (string | number)[][] = [headers, ...rows];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetAoA);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
