import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import {
  DeviceIntegrationConfigSchema,
  DeviceProtocolModeSchema,
  DeviceVendorSchema,
} from '@mams/types';
import { DeviceModel } from '../models/Device.js';
import { EmployeeModel } from '../models/Employee.js';
import { AttendanceRawModel } from '../models/AttendanceRaw.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.service.js';
import { syncDevice, testDeviceConnectivity } from '../services/deviceSync.service.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res, next) => {
  try {
    const items = await DeviceModel.find().sort({ deviceCode: 1 }).lean();
    const now = Date.now();
    const counts = await Promise.all(
      items.map(async (d) => {
        const [empCount, recentPunches] = await Promise.all([
          EmployeeModel.countDocuments({ status: 'Active', isDeleted: { $ne: true } }),
          AttendanceRawModel.countDocuments({
            deviceId: d._id,
            receivedAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) },
          }),
        ]);
        return { id: String(d._id), empCount, recentPunches };
      })
    );
    const map = new Map(counts.map((c) => [c.id, c]));

    const enriched = items.map((d) => ({
      ...d,
      vendor: d.vendor ?? 'eSSL',
      protocolMode: d.protocolMode ?? 'push',
      isOnline: d.lastPingAt ? d.lastPingAt > new Date(now - 5 * 60 * 1000) : false,
      totalEmployeesAssigned: map.get(String(d._id))?.empCount ?? 0,
      recentPunchCount: map.get(String(d._id))?.recentPunches ?? 0,
    }));

    res.json({ items: enriched, total: enriched.length });
  } catch (err) {
    next(err);
  }
});

const DeviceBaseSchema = z.object({
  deviceCode: z.string().min(1).max(50),
  serialNumber: z.string().min(1).max(100),
  vendor: DeviceVendorSchema.default('eSSL'),
  protocolMode: DeviceProtocolModeSchema.default('push'),
  integrationConfig: DeviceIntegrationConfigSchema.optional(),
  model: z.string().min(1),
  name: z.string().min(1),
  department: z.string().min(1),
  location: z.string().min(1),
  ipAddress: z.string().optional(),
  notes: z.string().optional(),
});

function refineHanvonConfig(data: z.infer<typeof DeviceBaseSchema>, ctx: z.RefinementCtx) {
  if (data.vendor === 'Hanvon' && data.protocolMode === 'pull' && !data.integrationConfig?.pullBaseUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Hanvon pull devices require integrationConfig.pullBaseUrl',
      path: ['integrationConfig', 'pullBaseUrl'],
    });
  }
  if (data.vendor === 'Hanvon' && data.protocolMode === 'push' && !data.integrationConfig?.pushToken) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Hanvon push devices require integrationConfig.pushToken',
      path: ['integrationConfig', 'pushToken'],
    });
  }
}

const DeviceCreateSchema = DeviceBaseSchema.superRefine(refineHanvonConfig);
const DevicePatchSchema = DeviceBaseSchema.partial();

router.post('/', requirePermission('manage.devices'), async (req, res, next) => {
  try {
    const body = DeviceCreateSchema.parse(req.body);
    const exists = await DeviceModel.findOne({ serialNumber: body.serialNumber });
    if (exists) throw new ApiError(409, 'duplicate_serial', 'A device with this serial number already exists');

    const created = await DeviceModel.create({ ...body, isActive: true });
    await audit(
      'device_registered',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      {
        entityType: 'device',
        entityId: created._id,
        payload: { serialNumber: body.serialNumber, model: body.model, vendor: body.vendor },
      }
    );
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requirePermission('manage.devices'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Device not found');
    const body = DevicePatchSchema.parse(req.body);
    const doc = await DeviceModel.findByIdAndUpdate(id, { $set: body }, { new: true });
    if (!doc) throw new ApiError(404, 'not_found', 'Device not found');
    await audit(
      'device_updated',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'device', entityId: doc._id, payload: { changedFields: Object.keys(body) } }
    );
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/test', requirePermission('manage.devices'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Device not found');
    const doc = await DeviceModel.findById(id);
    if (!doc) throw new ApiError(404, 'not_found', 'Device not found');
    const result = await testDeviceConnectivity(doc);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/sync', requirePermission('manage.devices'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Device not found');
    const doc = await DeviceModel.findById(id);
    if (!doc) throw new ApiError(404, 'not_found', 'Device not found');

    const result = await syncDevice(doc, req.clientIp ?? null);

    await audit(
      'device_synced',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'device', entityId: doc._id, payload: { ...result } as Record<string, unknown> }
    );

    if (!result.ok) {
      throw new ApiError(502, 'sync_failed', result.error ?? 'Device sync failed');
    }

    const updated = await DeviceModel.findById(id).lean();
    res.json({ ...result, device: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/sync-all', requirePermission('manage.devices'), async (req, res, next) => {
  try {
    const devices = await DeviceModel.find({ isActive: true });
    const results = await Promise.all(
      devices.map(async (d) => {
        const r = await syncDevice(d, req.clientIp ?? null);
        return { deviceId: String(d._id), serialNumber: d.serialNumber, ...r };
      })
    );
    const failed = results.filter((r) => !r.ok);
    await audit(
      'devices_synced_all',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { payload: { deviceCount: devices.length, failed: failed.length } }
    );
    res.json({ ok: failed.length === 0, count: devices.length, results });
  } catch (err) {
    next(err);
  }
});

export default router;
