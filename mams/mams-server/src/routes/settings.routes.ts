import { Router } from 'express';
import { z } from 'zod';
import {
  CompanyLogoSchema,
  ExportNamingSettingsSchema,
  FaviconSchema,
  LeaveQuotaResetPolicySchema,
  OrgBrandingSchema,
  TimeFormatSchema,
} from '@mams/types';
import { SettingsModel } from '../models/Settings.js';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';
import { diffSettingsValues, settingsSectionFromChangedFields } from '../services/activity.service.js';

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
  exportNaming: ExportNamingSettingsSchema.optional(),
  leaveQuotaResetPolicy: LeaveQuotaResetPolicySchema.optional(),
  financialYearStartMonth: z.number().int().min(1).max(12).optional(),
  timeFormat: TimeFormatSchema.optional(),
  companyLogo: CompanyLogoSchema.optional(),
  favicon: FaviconSchema.optional(),
  orgBranding: OrgBrandingSchema.optional(),
});

const ORG_SETTINGS_FIELDS = new Set([
  'companyName',
  'cin',
  'gstin',
  'pfRegistrationNumber',
  'esiRegistrationNumber',
  'factoryLicenceNumber',
  'registeredAddress',
  'signatoryName',
  'signatoryDesignation',
  'weeklyOffDefault',
  'realShifts',
  'complianceShifts',
  'smartAnchorEnabled',
  'confidentialityNoticeEnabled',
  'confidentialityNoticeText',
  'timeFormat',
  'companyLogo',
  'favicon',
  'orgBranding',
  'exportNaming',
]);

function canEditOrgSettings(perms: string[]): boolean {
  return perms.includes('manage.org_settings') || perms.includes('manage.settings');
}

function canEditExportNaming(perms: string[]): boolean {
  return (
    perms.includes('manage.org_settings') ||
    perms.includes('manage.export_naming') ||
    perms.includes('manage.settings')
  );
}

router.patch('/', async (req, res, next) => {
  try {
    const patch = SettingsPatchSchema.parse(req.body);
    const changedKeys = Object.entries(patch)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);
    if (changedKeys.length < 1) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const perms = req.auth!.permissions;
    const touchesOrgSettings = changedKeys.some((k) => ORG_SETTINGS_FIELDS.has(k));
    const touchesExportNaming = changedKeys.includes('exportNaming');
    if (touchesOrgSettings && !canEditOrgSettings(perms)) {
      res.status(403).json({ error: 'forbidden', requiredPermission: 'manage.org_settings' });
      return;
    }
    if (touchesExportNaming && !canEditExportNaming(perms)) {
      res.status(403).json({ error: 'forbidden', requiredPermission: 'manage.export_naming' });
      return;
    }
    let doc = await SettingsModel.findOne();
    if (!doc) doc = await SettingsModel.create({});

    const docBefore = doc.toObject() as Record<string, unknown>;
    const { before, after, changedFields } = diffSettingsValues(docBefore, patch as Record<string, unknown>);

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (key === 'orgBranding' && value && typeof value === 'object') {
        const existing = (doc.toObject().orgBranding ?? {}) as Record<string, unknown>;
        Object.assign(doc, {
          orgBranding: {
            ...existing,
            ...(value as Record<string, unknown>),
            updatedAt: new Date(),
            updatedBy: req.auth!.sub,
          },
        });
        continue;
      }
      (doc as any)[key] = value;
    }
    await doc.save();

    if (changedFields.length > 0) {
      await audit(
        'settings_changed',
        { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
        {
          entityType: 'settings',
          entityId: doc._id,
          payload: {
            before,
            after,
            changedFields,
            section: settingsSectionFromChangedFields(changedFields),
          },
        }
      );
    }

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

export default router;
