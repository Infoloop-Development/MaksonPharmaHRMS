import { Router } from 'express';
import { z } from 'zod';
import { SettingsModel } from '../models/Settings.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res, next) => {
  try {
    let doc = await SettingsModel.findOne();
    if (!doc) doc = await SettingsModel.create({});
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

const ShiftWindowSchema = z.object({
  id: z.string(),
  start: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM format'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM format'),
  label: z.string().min(1),
});

const SettingsPatchSchema = z.object({
  companyName: z.string().min(1).optional(),
  cin: z.string().optional(),
  gstin: z.string().optional(),
  pfRegistrationNumber: z.string().optional(),
  esiRegistrationNumber: z.string().optional(),
  factoryLicenceNumber: z.string().optional(),
  registeredAddress: z.string().optional(),
  signatoryName: z.string().optional(),
  signatoryDesignation: z.string().optional(),
  weeklyOffDefault: z.array(z.string()).optional(),
  realShifts: z.array(ShiftWindowSchema).optional(),
  complianceShifts: z.array(ShiftWindowSchema).optional(),
  smartAnchorEnabled: z.boolean().optional(),
  confidentialityNoticeEnabled: z.boolean().optional(),
  confidentialityNoticeText: z.string().optional(),
});

router.patch('/', requirePermission('manage.settings'), async (req, res, next) => {
  try {
    const patch = SettingsPatchSchema.parse(req.body);
    let doc = await SettingsModel.findOne();
    if (!doc) doc = await SettingsModel.create({});

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      before[key] = (doc as any)[key];
      after[key] = value;
      (doc as any)[key] = value;
    }
    await doc.save();

    await audit(
      'settings_changed',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'settings', entityId: doc._id, payload: { before, after, changedFields: Object.keys(after) } }
    );

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

export default router;
