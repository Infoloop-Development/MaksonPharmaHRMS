import type { BugReportExportQuery, BugReportListQuery, BugReportStatsQuery } from '@mams/types';
import { istDateEndUtc, istDateStartUtc } from '../utils/time.js';

type DateRangeInput = Pick<BugReportListQuery, 'raisedFrom' | 'raisedTo'>;

/** Build a Mongo filter on `createdAt` for bug raised-date range (IST calendar days). */
export function buildBugReportRaisedDateFilter(
  input: DateRangeInput | BugReportStatsQuery | BugReportExportQuery
): Record<string, Date> | null {
  const { raisedFrom, raisedTo } = input;
  if (!raisedFrom && !raisedTo) return null;

  const range: Record<string, Date> = {};
  if (raisedFrom) {
    range.$gte = istDateStartUtc(raisedFrom);
  }
  if (raisedTo) {
    range.$lte = istDateEndUtc(raisedTo);
  } else if (raisedFrom) {
    range.$lte = new Date();
  }
  return range;
}

/** Build elemMatch on `statusHistory.changedAt` for resolution-in-range stats. */
export function buildBugReportResolvedDateFilter(
  input: DateRangeInput | BugReportStatsQuery | BugReportExportQuery
): Record<string, Date> | null {
  return buildBugReportRaisedDateFilter(input);
}
