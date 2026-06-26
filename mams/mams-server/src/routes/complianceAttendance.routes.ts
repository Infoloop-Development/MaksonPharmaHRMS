import { Router } from 'express';
import { z } from 'zod';
import { ComplianceShiftSchema, SortDirSchema } from '@mams/types';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import {
  runComplianceAutogenForDate,
  runComplianceAutogenForMonth,
  yesterdayIstDateString,
} from '../services/complianceAutogen.service.js';
import { listComplianceGeneratedAttendance } from '../services/complianceAttendanceList.service.js';
import {
  buildComplianceMonthlyReportXlsx,
  complianceReportFilename,
  XLSX_CONTENT_TYPE,
} from '../services/complianceMonthlyReport.service.js';
import { env } from '../config/env.js';

const router = Router();
router.use(requireAuth);

const ListQuerySchema = z.object({
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  alternateShift: ComplianceShiftSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
  sortBy: z
    .enum(['date', 'name', 'empCode', 'department', 'alternateShift', 'hoursWorked', 'status'])
    .optional(),
  sortDir: SortDirSchema.optional(),
});

router.get('/', requirePermission('read.compliant'), async (req, res, next) => {
  try {
    const q = ListQuerySchema.parse(req.query);
    const result = await listComplianceGeneratedAttendance(q);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const ReportBodySchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  employees: z
    .array(
      z.object({
        employeeId: z.string().min(1),
        empCode: z.string(),
        name: z.string(),
        department: z.string(),
        alternateShift: ComplianceShiftSchema,
        totalHours: z.number().min(0),
      })
    )
    .min(1)
    .max(200),
});

router.post('/report.xlsx', requirePermission('read.compliant'), async (req, res, next) => {
  try {
    const body = ReportBodySchema.parse(req.body);
    const buffer = buildComplianceMonthlyReportXlsx(body);
    const filename = complianceReportFilename(body.yearMonth);
    res.setHeader('Content-Type', XLSX_CONTENT_TYPE);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.post('/generate-month', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }

    const cronSecret = req.header('x-cron-secret');
    const hasCronAuth = Boolean(
      env.COMPLIANCE_AUTOGEN_CRON_SECRET && cronSecret === env.COMPLIANCE_AUTOGEN_CRON_SECRET
    );
    const canGenerate =
      hasCronAuth ||
      req.auth.role === 'org.admin' ||
      req.auth.permissions.includes('read.compliant');

    if (!canGenerate) {
      throw new ApiError(403, 'forbidden', 'Not allowed to trigger compliance autogen');
    }

    const yearMonth =
      typeof req.query.yearMonth === 'string' && req.query.yearMonth
        ? req.query.yearMonth
        : undefined;
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      throw new ApiError(400, 'invalid_month', 'yearMonth query required (YYYY-MM)');
    }

    const result = await runComplianceAutogenForMonth(yearMonth);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }

    const cronSecret = req.header('x-cron-secret');
    const hasCronAuth = Boolean(
      env.COMPLIANCE_AUTOGEN_CRON_SECRET && cronSecret === env.COMPLIANCE_AUTOGEN_CRON_SECRET
    );
    const canGenerate =
      hasCronAuth ||
      req.auth.role === 'org.admin' ||
      req.auth.permissions.includes('read.compliant');

    if (!canGenerate) {
      throw new ApiError(403, 'forbidden', 'Not allowed to trigger compliance autogen');
    }

    const date = typeof req.query.date === 'string' && req.query.date
      ? req.query.date
      : undefined;
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ApiError(400, 'invalid_date', 'date must be YYYY-MM-DD');
    }

    const targetDate = date ?? yesterdayIstDateString();
    const result = await runComplianceAutogenForDate(targetDate);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
