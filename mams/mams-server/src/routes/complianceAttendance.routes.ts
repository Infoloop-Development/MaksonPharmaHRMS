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
  resolveComplianceReportEmployees,
} from '../services/complianceMonthlyReport.service.js';
import {
  buildFinancialReportRows,
  buildFinancialReportXlsx,
  financialReportFilename,
  sumComplianceHoursForMonth,
  XLSX_CONTENT_TYPE,
} from '../services/complianceFinancialReport.service.js';
import { updateComplianceGeneratedAttendance } from '../services/complianceAttendanceUpdate.service.js';
import { ComplianceAttendanceUpdateSchema } from '@mams/types';
import { env } from '../config/env.js';

const router = Router();
router.use(requireAuth);

function requireOrgAdmin(req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) {
  if (!req.auth || req.auth.role !== 'org.admin') {
    next(new ApiError(403, 'forbidden', 'Org admin only'));
    return;
  }
  next();
}

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
  overrides: z
    .array(
      z.object({
        employeeId: z.string().min(1),
        totalHours: z.number().min(0),
      })
    )
    .max(500)
    .default([]),
});

router.post('/report.xlsx', requirePermission('read.compliant'), async (req, res, next) => {
  try {
    const body = ReportBodySchema.parse(req.body);
    const employees = await resolveComplianceReportEmployees(body.yearMonth, body.overrides);
    const buffer = buildComplianceMonthlyReportXlsx({
      yearMonth: body.yearMonth,
      employees,
    });
    const filename = complianceReportFilename(body.yearMonth);
    res.setHeader('Content-Type', XLSX_CONTENT_TYPE);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

const FinancialReportBodySchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  employees: z
    .array(
      z.object({
        employeeId: z.string().min(1),
        name: z.string(),
        realHours: z.number().min(0),
      })
    )
    .min(1)
    .max(200),
});

router.get(
  '/month-hours',
  requirePermission('read.compliant'),
  requireOrgAdmin,
  async (req, res, next) => {
    try {
      const employeeId = String(req.query.employeeId ?? '');
      const yearMonth = String(req.query.yearMonth ?? '');
      if (!employeeId || !/^\d{4}-\d{2}$/.test(yearMonth)) {
        throw new ApiError(400, 'invalid_query', 'employeeId and yearMonth (YYYY-MM) required');
      }
      const raw = await sumComplianceHoursForMonth(employeeId, yearMonth);
      res.json({ complianceHours: raw });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/financial-report.xlsx',
  requirePermission('read.compliant'),
  requireOrgAdmin,
  async (req, res, next) => {
    try {
      const body = FinancialReportBodySchema.parse(req.body);
      const rows = await buildFinancialReportRows(body);
      const buffer = buildFinancialReportXlsx(rows);
      const filename = financialReportFilename(body.yearMonth);
      res.setHeader('Content-Type', XLSX_CONTENT_TYPE);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:id',
  requirePermission('read.compliant'),
  requireOrgAdmin,
  async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!id) {
        throw new ApiError(400, 'invalid_id', 'Record id required');
      }
      const body = ComplianceAttendanceUpdateSchema.parse(req.body);
      const updated = await updateComplianceGeneratedAttendance(id, body, {
        userId: req.auth!.sub,
        ipAddress: req.clientIp ?? null,
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

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
