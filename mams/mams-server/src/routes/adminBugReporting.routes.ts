import { Router } from 'express';
import { BugReportListQuerySchema, BugReportPatchBodySchema } from '@mams/types';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';
import {
  getBugReportDetail,
  listBugReportModules,
  listBugReports,
  patchBugReport,
} from '../services/bugReporting.service.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('manage.bug_reports'));

router.get('/modules', async (_req, res, next) => {
  try {
    res.json({ modules: await listBugReportModules() });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const query = BugReportListQuerySchema.parse(req.query);
    res.json(await listBugReports(query));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    res.json(await getBugReportDetail(req.params.id ?? ''));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = BugReportPatchBodySchema.parse(req.body);
    const updated = await patchBugReport(req.params.id ?? '', body);
    await audit(
      'bug_report_updated',
      {
        userId: req.auth!.sub,
        ipAddress: req.clientIp ?? null,
        userAgent: req.header('user-agent') ?? null,
      },
      {
        entityType: 'bug_report',
        entityId: req.params.id,
        payload: body,
      }
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
