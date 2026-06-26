import { Router } from 'express';
import { z } from 'zod';
import { ComplianceShiftSchema } from '@mams/types';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { runComplianceAutogenForDate, yesterdayIstDateString } from '../services/complianceAutogen.service.js';
import { listComplianceGeneratedAttendance } from '../services/complianceAttendanceList.service.js';
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
