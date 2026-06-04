import { Router } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { DeviceModel } from '../models/Device.js';
import { ingestCanonicalPunches } from '../services/attendanceIngestion.service.js';
import { logger } from '../utils/logger.js';
import { esslAdapter, buildEsslHandshakeResponse } from '../integrations/adapters/essl/adapter.js';

/**
 * eSSL ADMS protocol receiver.
 * See docs/tech/03_eSSL_ADMS_Protocol_Cheatsheet.pdf for full protocol reference.
 *
 * Mounted at /iclock (not /api) to match the path eSSL devices expect.
 */
const router = Router();

const iclockLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many device requests',
});

router.use(iclockLimiter);

const textBody = express.text({ type: '*/*', limit: '1mb' });

async function findEsslDevice(serialNumber: string) {
  const device = await DeviceModel.findOne({ serialNumber, isActive: true });
  if (!device) return null;
  const vendor = device.vendor ?? 'eSSL';
  if (vendor !== 'eSSL') return null;
  return device;
}

// 4.1 Device handshake / registration
router.get('/cdata', async (req, res) => {
  const sn = String(req.query.SN ?? '');
  const device = await findEsslDevice(sn);
  if (!device) {
    res.status(404).type('text/plain').send('Device not registered');
    return;
  }
  device.lastPingAt = new Date();
  await device.save();
  res.type('text/plain').send(buildEsslHandshakeResponse(sn));
});

// 4.2 Attendance push (the important one)
router.post('/cdata', textBody, async (req, res) => {
  const sn = String(req.query.SN ?? '');
  const table = String(req.query.table ?? '');

  const device = await findEsslDevice(sn);
  if (!device) {
    res.status(404).type('text/plain').send('Device not registered');
    return;
  }

  if (table === 'ATTLOG') {
    const events = esslAdapter.parsePunches(req.body, {
      device,
      sourceIp: req.clientIp ?? null,
    });
    const malformed = String(req.body ?? '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean).length - events.length;
    if (malformed > 0) {
      logger.warn('essl_malformed_attlog_lines', { sn, count: malformed });
    }
    await ingestCanonicalPunches(device, events, req.clientIp ?? null);
  } else if (table === 'OPERLOG') {
    logger.debug('operlog_received', { sn, body: String(req.body ?? '').slice(0, 500) });
  }

  res.type('text/plain').send('OK');
});

router.get('/getrequest', (_req, res) => {
  res.type('text/plain').send('OK');
});

router.post('/devicecmd', textBody, (_req, res) => {
  res.type('text/plain').send('OK');
});

export default router;
