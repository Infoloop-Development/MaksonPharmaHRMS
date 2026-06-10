import type { HolidayDoc } from '../../models/Holiday.js';
import { eachDateInRange } from './leaveDate.util.js';

export interface LeaveDayCalcInput {
  fromDate: string;
  toDate: string;
  halfDayPortion?: 'first' | 'second' | null;
  department: string;
  location: string;
  holidays: Pick<HolidayDoc, 'date' | 'departments' | 'locations'>[];
}

export interface LeaveDayCalcResult {
  totalDays: number;
  excludedHolidayDates: string[];
}

export function holidayAppliesToEmployee(
  holiday: Pick<HolidayDoc, 'departments' | 'locations'>,
  department: string,
  location: string
): boolean {
  const deptOk =
    !holiday.departments?.length || holiday.departments.includes(department);
  const locOk =
    !holiday.locations?.length || holiday.locations.includes(location);
  return deptOk && locOk;
}

export function calculateLeaveDays(input: LeaveDayCalcInput): LeaveDayCalcResult {
  if (input.halfDayPortion) {
    const dates = eachDateInRange(input.fromDate, input.toDate);
    const excluded = dates.filter((d) =>
      input.holidays.some(
        (h) => h.date === d && holidayAppliesToEmployee(h, input.department, input.location)
      )
    );
    if (excluded.includes(input.fromDate)) {
      return { totalDays: 0, excludedHolidayDates: excluded };
    }
    return { totalDays: 0.5, excludedHolidayDates: excluded };
  }

  const dates = eachDateInRange(input.fromDate, input.toDate);
  const excludedHolidayDates: string[] = [];
  let count = 0;
  for (const d of dates) {
    const isHoliday = input.holidays.some(
      (h) => h.date === d && holidayAppliesToEmployee(h, input.department, input.location)
    );
    if (isHoliday) {
      excludedHolidayDates.push(d);
    } else {
      count += 1;
    }
  }
  return { totalDays: count, excludedHolidayDates };
}
