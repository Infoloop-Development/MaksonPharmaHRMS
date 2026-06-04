import type { CanonicalPunchEvent } from '@mams/types';
import type { AdapterParseContext, DeviceAdapter } from '../../types.js';
import { buildIdempotencyKey } from '../../idempotency.js';

export const ESSL_PARSER_VERSION = '1.0.0';
export const ESSL_RAW_PROTOCOL = 'ADMS/ATTLOG';

export interface EsslAttLogLine {
  userId: string;
  timestamp: string;
  status: number;
  verifyType: number;
  workCode: number;
}

export function parseAttLogLine(line: string): EsslAttLogLine | null {
  const parts = line.split('\t');
  if (parts.length < 4) return null;
  const [userId, timestamp, status, verifyType, workCode] = parts;
  if (!userId || !timestamp) return null;
  return {
    userId,
    timestamp,
    status: Number(status ?? 0),
    verifyType: Number(verifyType ?? 0),
    workCode: Number(workCode ?? 0),
  };
}

export function attLogLineToCanonical(
  line: EsslAttLogLine,
  deviceSerial: string
): CanonicalPunchEvent | null {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(line.timestamp)) return null;
  const punchType = line.status === 0 ? 'IN' : line.status === 1 ? 'OUT' : 'OTHER';
  return {
    biometricId: line.userId,
    timestampIst: line.timestamp,
    punchType,
    verifyType: line.verifyType,
    workCode: line.workCode,
    vendor: 'eSSL',
    rawProtocol: ESSL_RAW_PROTOCOL,
    parserVersion: ESSL_PARSER_VERSION,
    vendorPayload: { ...line },
    idempotencyKey: buildIdempotencyKey({
      vendor: 'eSSL',
      deviceSerial,
      biometricId: line.userId,
      timestampIst: line.timestamp,
      punchType,
    }),
  };
}

export const esslAdapter: DeviceAdapter = {
  vendor: 'eSSL',
  parserVersion: ESSL_PARSER_VERSION,
  rawProtocol: ESSL_RAW_PROTOCOL,
  parsePunches(input: unknown, ctx: AdapterParseContext): CanonicalPunchEvent[] {
    const body = String(input ?? '');
    const lines = body.split('\n').map((s) => s.trim()).filter(Boolean);
    const out: CanonicalPunchEvent[] = [];
    for (const line of lines) {
      const parsed = parseAttLogLine(line);
      if (!parsed) continue;
      const canonical = attLogLineToCanonical(parsed, ctx.device.serialNumber);
      if (canonical) out.push(canonical);
    }
    return out;
  },
};

export function buildEsslHandshakeResponse(serialNumber: string): string {
  return [
    `GET OPTION FROM: ${serialNumber}`,
    'ATTLOGStamp=9999',
    'OPERLOGStamp=9999',
    'ATTPHOTOStamp=None',
    'ErrorDelay=30',
    'Delay=30',
    'TransTimes=00:00;14:05',
    'TransInterval=1',
    'TransFlag=TransData AttLog OpLog AttPhoto EnrollUser ChgUser EnrollFP ChgFP UserPic',
    'TimeZone=8',
    'Realtime=1',
    'Encrypt=None',
    '',
  ].join('\n');
}
