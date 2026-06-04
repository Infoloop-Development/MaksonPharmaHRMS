import type { CanonicalPunchEvent, DeviceVendor } from '@mams/types';
import type { DeviceDoc } from '../models/Device.js';

export interface AdapterParseContext {
  device: DeviceDoc;
  sourceIp: string | null;
}

export interface DeviceAdapter {
  readonly vendor: DeviceVendor;
  readonly parserVersion: string;
  readonly rawProtocol: string;
  parsePunches(input: unknown, ctx: AdapterParseContext): CanonicalPunchEvent[];
}

export interface IngestionResult {
  inserted: number;
  duplicates: number;
  orphans: string[];
  affectedPairs: number;
}
