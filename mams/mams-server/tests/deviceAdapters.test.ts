import { describe, it, expect } from 'vitest';
import {
  parseAttLogLine,
  attLogLineToCanonical,
  esslAdapter,
} from '../src/integrations/adapters/essl/adapter.js';
import { hanvonAdapter, parseHanvonPullRecords } from '../src/integrations/adapters/hanvon/adapter.js';
import { buildIdempotencyKey } from '../src/integrations/idempotency.js';

const mockDevice = {
  _id: '507f1f77bcf86cd799439011',
  serialNumber: 'TEST-SN-001',
  vendor: 'eSSL',
} as any;

describe('eSSL adapter', () => {
  it('parses ATTLOG tab-separated lines', () => {
    const line = parseAttLogLine('BIO001\t2026-06-02 09:15:00\t0\t1\t0\t0\t0');
    expect(line).toMatchObject({ userId: 'BIO001', status: 0, verifyType: 1 });
  });

  it('maps status 0/1 to IN/OUT', () => {
    const inPunch = attLogLineToCanonical(
      { userId: 'BIO001', timestamp: '2026-06-02 09:15:00', status: 0, verifyType: 1, workCode: 0 },
      'SN1'
    );
    const outPunch = attLogLineToCanonical(
      { userId: 'BIO001', timestamp: '2026-06-02 18:00:00', status: 1, verifyType: 1, workCode: 0 },
      'SN1'
    );
    expect(inPunch?.punchType).toBe('IN');
    expect(outPunch?.punchType).toBe('OUT');
  });

  it('parsePunches handles multiline ATTLOG body', () => {
    const body = [
      'BIO001\t2026-06-02 09:15:00\t0\t1\t0\t0\t0',
      'BIO002\t2026-06-02 09:20:00\t1\t1\t0\t0\t0',
    ].join('\n');
    const events = esslAdapter.parsePunches(body, { device: mockDevice, sourceIp: '127.0.0.1' });
    expect(events).toHaveLength(2);
    expect(events[0]?.vendor).toBe('eSSL');
  });
});

describe('Hanvon adapter', () => {
  it('parses SDK push JSON', () => {
    const body = {
      deviceSn: 'HNV-001',
      records: [{ userId: 'BIO003', time: '2026-06-02T10:30:00', inOut: 0 }],
    };
    const events = hanvonAdapter.parsePunches(body, {
      device: { ...mockDevice, serialNumber: 'HNV-001', vendor: 'Hanvon' },
      sourceIp: null,
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.timestampIst).toBe('2026-06-02 10:30:00');
    expect(events[0]?.punchType).toBe('IN');
  });

  it('parses pull API records', () => {
    const events = parseHanvonPullRecords(
      [{ userId: '42', time: '2026-06-02 14:00:00', inOut: 1 }],
      'HNV-001'
    );
    expect(events[0]?.biometricId).toBe('42');
    expect(events[0]?.punchType).toBe('OUT');
  });
});

describe('idempotency', () => {
  it('builds stable keys for same input', () => {
    const a = buildIdempotencyKey({
      vendor: 'eSSL',
      deviceSerial: 'SN1',
      biometricId: 'BIO001',
      timestampIst: '2026-06-02 09:00:00',
      punchType: 'IN',
    });
    const b = buildIdempotencyKey({
      vendor: 'eSSL',
      deviceSerial: 'SN1',
      biometricId: 'BIO001',
      timestampIst: '2026-06-02 09:00:00',
      punchType: 'IN',
    });
    expect(a).toBe(b);
  });

  it('differs when punch type changes', () => {
    const a = buildIdempotencyKey({
      vendor: 'eSSL',
      deviceSerial: 'SN1',
      biometricId: 'BIO001',
      timestampIst: '2026-06-02 09:00:00',
      punchType: 'IN',
    });
    const b = buildIdempotencyKey({
      vendor: 'eSSL',
      deviceSerial: 'SN1',
      biometricId: 'BIO001',
      timestampIst: '2026-06-02 09:00:00',
      punchType: 'OUT',
    });
    expect(a).not.toBe(b);
  });
});
