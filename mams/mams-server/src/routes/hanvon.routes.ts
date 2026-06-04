import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { DeviceModel } from '../models/Device.js';
import { ingestCanonicalPunches } from '../services/attendanceIngestion.service.js';
import { hanvonAdapter } from '../integrations/adapters/hanvon/adapter.js';
import { logger } from '../utils/logger.js';

/**
 * Hanvon SDK push receiver (JSON).
 * Devices POST attendance batches; auth via X-Device-Serial + X-Device-Token headers.
 */
const router = Router();

const hanvonLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limit', message: 'Too many Hanvon push requests' },
});

router.use(hanvonLimiter);

router.post('/push', async (req, res) => {
  const serial = String(req.header('x-device-serial') ?? req.body?.deviceSn ?? '');
  const token = String(req.header('x-device-token') ?? '');

  if (!serial) {
    res.status(400).json({ error: 'missing_serial', message: 'X-Device-Serial or deviceSn required' });
    return;
  }

  const device = await DeviceModel.findOne({
    serialNumber: serial,
    vendor: 'Hanvon',
    isActive: true,
  });
  if (!device) {
    res.status(404).json({ error: 'device_not_registered' });
    return;
  }

  const expectedToken = device.integrationConfig?.pushToken;
  if (expectedToken && token !== expectedToken) {
    logger.warn('hanvon_push_auth_failed', { serial });
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  const events = hanvonAdapter.parsePunches(req.body, {
    device,
    sourceIp: req.clientIp ?? null,
  });

  if (events.length === 0) {
    res.status(400).json({ error: 'no_valid_records', message: 'Payload had no parseable punch records' });
    return;
  }

  const result = await ingestCanonicalPunches(device, events, req.clientIp ?? null);
  res.json({
    ok: true,
    inserted: result.inserted,
    duplicates: result.duplicates,
    orphans: result.orphans,
  });
});

export default router;
