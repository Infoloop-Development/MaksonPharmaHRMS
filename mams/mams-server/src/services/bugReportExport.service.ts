import ExcelJS from 'exceljs';
import { Types } from 'mongoose';
import {
  BUG_REPORT_SEVERITY_LABELS,
  BugReportExportQuerySchema,
  formatBugActivityTimelineText,
  resolveBugResolvedTimestamp,
  type BugReportExportQuery,
} from '@mams/types';
import { BugReportModel } from '../models/BugReport.js';
import { buildBugReportRaisedDateFilter } from './bugReportDateFilter.js';
import { loadPhaseMap } from './bugPhase.service.js';
import {
  getBugReportDetail,
  listBugReports,
} from './bugReporting.service.js';

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export { XLSX_CONTENT_TYPE };

export function bugReportExportFilename(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `bug-reports-${stamp}.xlsx`;
}

async function fetchAllBugReportsInRange(query: BugReportExportQuery) {
  const pageSize = 100;
  let page = 1;
  const items = [];
  let total = 0;
  do {
    const res = await listBugReports({ ...query, page, pageSize, sortBy: 'createdAt', sortDir: 'asc' });
    total = res.total;
    items.push(...res.items);
    page += 1;
  } while (items.length < total);
  return items;
}

export async function exportBugReportsXlsx(query: BugReportExportQuery): Promise<Buffer> {
  const q = BugReportExportQuerySchema.parse(query);
  const phaseMap = await loadPhaseMap();
  const listItems = await fetchAllBugReportsInRange(q);

  const workbook = new ExcelJS.Workbook();
  const bugsSheet = workbook.addWorksheet('Bugs');
  bugsSheet.columns = [
    { header: 'Bug ID', key: 'bugId', width: 14 },
    { header: 'Title', key: 'title', width: 36 },
    { header: 'Severity', key: 'severity', width: 12 },
    { header: 'Reporter', key: 'reporter', width: 22 },
    { header: 'Assigned To', key: 'assignedTo', width: 22 },
    { header: 'Assigned By', key: 'assignedBy', width: 22 },
    { header: 'Assigned At', key: 'assignedAt', width: 22 },
    { header: 'Current Phase', key: 'phase', width: 18 },
    { header: 'Raised Timestamp', key: 'raisedAt', width: 22 },
    { header: 'Resolved Timestamp', key: 'resolvedAt', width: 22 },
    { header: 'Activity Timeline', key: 'timeline', width: 60 },
  ];
  bugsSheet.getRow(1).font = { bold: true };

  for (const item of listItems) {
    const detail = await getBugReportDetail(item.id, { probeVideoAudio: false });
    const latestAssignment = detail.assignmentHistory.at(-1);
    const phaseIsResolved = (phaseId: string) => phaseMap.get(phaseId)?.isResolvedState === true;
    const resolvedAt = resolveBugResolvedTimestamp(detail, phaseIsResolved);

    bugsSheet.addRow({
      bugId: detail.publicId,
      title: detail.title,
      severity: BUG_REPORT_SEVERITY_LABELS[detail.severity],
      reporter: detail.reporter.name,
      assignedTo: detail.assignee?.name ?? '',
      assignedBy: latestAssignment?.assignedBy.name ?? '',
      assignedAt: latestAssignment?.assignedAt ?? '',
      phase: detail.phaseLabel,
      raisedAt: detail.createdAt,
      resolvedAt: resolvedAt ?? '',
      timeline: formatBugActivityTimelineText(detail),
    });
  }

  const raisedDateFilter = buildBugReportRaisedDateFilter(q);
  const baseFilter: Record<string, unknown> = {};
  if (raisedDateFilter) {
    baseFilter.createdAt = raisedDateFilter;
  }
  const resolvedPhaseIds = [...phaseMap.values()]
    .filter((p) => p.isResolvedState)
    .map((p) => new Types.ObjectId(p.id));
  const [totalRaised, totalSolved] = await Promise.all([
    BugReportModel.countDocuments(baseFilter),
    resolvedPhaseIds.length
      ? BugReportModel.countDocuments({ ...baseFilter, phaseId: { $in: resolvedPhaseIds } })
      : Promise.resolve(0),
  ]);

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 28 },
    { header: 'Value', key: 'value', width: 16 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.addRow({ metric: 'Total Bugs Raised', value: totalRaised });
  summarySheet.addRow({ metric: 'Total Bugs Solved', value: totalSolved });
  if (q.raisedFrom) {
    summarySheet.addRow({ metric: 'Start Date', value: q.raisedFrom });
  }
  if (q.raisedTo) {
    summarySheet.addRow({ metric: 'End Date', value: q.raisedTo });
  } else if (q.raisedFrom) {
    summarySheet.addRow({ metric: 'End Date', value: 'Now' });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
