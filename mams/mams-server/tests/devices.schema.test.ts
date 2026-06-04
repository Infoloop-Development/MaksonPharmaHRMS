import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  DeviceIntegrationConfigSchema,
  DeviceProtocolModeSchema,
  DeviceVendorSchema,
} from '@mams/types';

const DeviceCreateBodySchema = z
  .object({
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
  })
  .superRefine((data, ctx) => {
    if (data.vendor === 'Hanvon' && data.protocolMode === 'push' && !data.integrationConfig?.pushToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hanvon push devices require integrationConfig.pushToken',
        path: ['integrationConfig', 'pushToken'],
      });
    }
  });

describe('Device create schema', () => {
  const validEssl = {
    deviceCode: 'DEV-099',
    serialNumber: 'TEST-SN-099',
    vendor: 'eSSL' as const,
    protocolMode: 'push' as const,
    model: 'eSSL SilkBio-101TC',
    name: 'Test Gate',
    department: 'Admin',
    location: 'Surendranagar, GJ',
  };

  it('accepts eSSL device with department and location', () => {
    const r = DeviceCreateBodySchema.safeParse(validEssl);
    expect(r.success).toBe(true);
  });

  it('rejects missing department', () => {
    const { department: _, ...rest } = validEssl;
    const r = DeviceCreateBodySchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('requires Hanvon push token', () => {
    const r = DeviceCreateBodySchema.safeParse({
      ...validEssl,
      vendor: 'Hanvon',
      model: 'Hanvon FaceID F710',
      integrationConfig: {},
    });
    expect(r.success).toBe(false);
  });

  it('accepts Hanvon push with token', () => {
    const r = DeviceCreateBodySchema.safeParse({
      ...validEssl,
      vendor: 'Hanvon',
      model: 'Hanvon FaceID F710',
      integrationConfig: { pushToken: 'secure-token-12345' },
    });
    expect(r.success).toBe(true);
  });
});
