import { format as formatTz, toZonedTime } from 'date-fns-tz';
import type { CanonicalPunchEvent } from '@mams/types';
import type { AdapterParseContext, DeviceAdapter } from '../../types.js';
import { buildIdempotencyKey } from '../../idempotency.js';

const IST = 'Asia/Kolkata';

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

/** Force device to treat server as empty so buffered ATTLOG rows are pushed. */
export function buildEsslHandshakeResponse(serialNumber: string): string {
  return [
    `GET OPTION FROM: ${serialNumber}`,
    'ATTLOGStamp=0',
    'OPERLOGStamp=0',
    'ATTPHOTOStamp=None',
    'ErrorDelay=30',
    'Delay=30',
    'TransTimes=00:00;23:59',
    'TransInterval=1',
    'TransFlag=TransData AttLog OpLog AttPhoto EnrollUser ChgUser EnrollFP ChgFP UserPic',
    'TimeZone=8',
    'Realtime=1',
    'Encrypt=None',
    '',
  ].join('\n');
}

/** ADMS command polled via GET /iclock/getrequest — asks device to upload ATTLOG rows. */
export function buildEsslAttLogQueryCommand(now: Date = new Date()): string {
  const cmdId = now.getTime() % 100000;
  const end = formatTz(toZonedTime(now, IST), 'yyyy-MM-dd HH:mm:ss', { timeZone: IST });
  const startAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start = formatTz(toZonedTime(startAt, IST), 'yyyy-MM-dd HH:mm:ss', { timeZone: IST });
  return `C:${cmdId}:DATA QUERY ATTLOG StartTime=${start}\tEndTime=${end}\n`;
}
