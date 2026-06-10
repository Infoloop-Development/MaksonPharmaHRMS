import type { LeaveQuotaResetPolicy } from '@mams/types';

export function resolvePeriodKey(
  policy: LeaveQuotaResetPolicy,
  referenceDate: string,
  joinDate: string,
  financialYearStartMonth: number
): { periodKey: string; periodType: LeaveQuotaResetPolicy } {
  const [y, m] = referenceDate.split('-').map(Number);
  const year = y!;

  if (policy === 'calendar_year') {
    return { periodKey: String(year), periodType: 'calendar_year' };
  }

  if (policy === 'financial_year') {
    const fyStart = financialYearStartMonth;
    const inNewFy = m! >= fyStart;
    const startYear = inNewFy ? year : year - 1;
    const endYear = startYear + 1;
    return {
      periodKey: `FY${startYear}-${String(endYear).slice(2)}`,
      periodType: 'financial_year',
    };
  }

  const [jy, jm, jd] = joinDate.split('-').map(Number);
  let annivYear = year;
  if (m! < jm! || (m === jm && referenceDate.slice(8) < String(jd).padStart(2, '0'))) {
    annivYear = year - 1;
  }
  return { periodKey: `JA-${annivYear}`, periodType: 'joining_anniversary' };
}
