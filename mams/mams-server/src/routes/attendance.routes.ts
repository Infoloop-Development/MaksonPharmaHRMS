import { Router } from 'express';
import { z } from 'zod';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { AttendanceRawListQuerySchema } from '@mams/types';
import { requireAuth } from '../middleware/auth.js';
import { listRawPunches } from '../services/attendanceRawList.service.js';

const router = Router();
router.use(requireAuth);

const QuerySchema = z.object({
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
});

router.get('/', async (req, res, next) => {
  try {
    const q = QuerySchema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (q.date) filter.date = q.date;
    if (q.startDate || q.endDate) {
      filter.date = {
        ...(q.startDate ? { $gte: q.startDate } : {}),
        ...(q.endDate ? { $lte: q.endDate } : {}),
      };
    }
    if (q.employeeId) filter.employeeId = q.employeeId;

    const isCompliant = req.auth!.viewMode === 'compliant';
    const projection = isCompliant
      ? 'employeeId date compliantEntryAt compliantExitAt compliantHours dayType status'
      : 'employeeId date realEntryAt realExitAt realGrossHours realNetHours breakMinutes otHours dayType status';

    const total = await AttendanceDerivedModel.countDocuments(filter);
    const items = await AttendanceDerivedModel.find(filter, projection)
      .populate('employeeId', 'name empCode department location')
      .sort({ date: -1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean();

    res.json({
      viewMode: req.auth!.viewMode,
      items,
      total,
      page: q.page,
      pageSize: q.pageSize,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/raw', async (req, res, next) => {
  try {
    const q = AttendanceRawListQuerySchema.parse(req.query);
    const result = await listRawPunches(q);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Live raw punch feed - polled every ~5s by the AttendanceLog page.
router.get('/raw/recent', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const result = await listRawPunches({
      page: 1,
      pageSize: limit,
      limit,
    });
    res.json({ items: result.items });
  } catch (err) {
    next(err);
  }
});

export default router;
