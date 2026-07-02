import { Router } from 'express';
import {
  RecycleBinBulkBodySchema,
  RecycleBinListQuerySchema,
} from '@mams/types';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
  bulkPurgeRecycleBin,
  bulkRestoreRecycleBin,
  listRecycleBin,
} from '../services/recycleBin.service.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('manage.recycle_bin'));

router.get('/', async (req, res, next) => {
  try {
    const query = RecycleBinListQuerySchema.parse(req.query);
    res.json(await listRecycleBin(query));
  } catch (err) {
    next(err);
  }
});

router.post('/restore', async (req, res, next) => {
  try {
    const body = RecycleBinBulkBodySchema.parse(req.body);
    const result = await bulkRestoreRecycleBin(body.items, {
      userId: req.auth!.sub,
      ipAddress: req.clientIp ?? null,
      userAgent: req.header('user-agent') ?? null,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/purge', async (req, res, next) => {
  try {
    const body = RecycleBinBulkBodySchema.parse(req.body);
    const result = await bulkPurgeRecycleBin(body.items, {
      userId: req.auth!.sub,
      ipAddress: req.clientIp ?? null,
      userAgent: req.header('user-agent') ?? null,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/bulk-restore', async (req, res, next) => {
  try {
    const body = RecycleBinBulkBodySchema.parse(req.body);
    const result = await bulkRestoreRecycleBin(body.items, {
      userId: req.auth!.sub,
      ipAddress: req.clientIp ?? null,
      userAgent: req.header('user-agent') ?? null,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/bulk-purge', async (req, res, next) => {
  try {
    const body = RecycleBinBulkBodySchema.parse(req.body);
    const result = await bulkPurgeRecycleBin(body.items, {
      userId: req.auth!.sub,
      ipAddress: req.clientIp ?? null,
      userAgent: req.header('user-agent') ?? null,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
