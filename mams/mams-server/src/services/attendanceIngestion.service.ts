import { Types } from 'mongoose';
import type { CanonicalPunchEvent } from '@mams/types';
import { AttendanceRawModel } from '../models/AttendanceRaw.js';
import { EmployeeModel } from '../models/Employee.js';
import type { DeviceDoc } from '../models/Device.js';
import { recomputeDerived } from './attendance.service.js';
import { audit } from './audit.service.js';
import { istStringToUtc, utcToIstDateString } from '../utils/time.js';
import { logger } from '../utils/logger.js';
import type { IngestionResult } from '../integrations/types.js';

/**
 * Protocol-agnostic punch ingestion. All vendor adapters funnel here.
 * Append-only raw storage + idempotent inserts + derived recompute.
 */
export async function ingestCanonicalPunches(
  device: DeviceDoc,
  events: CanonicalPunchEvent[],
  sourceIp: string | null
): Promise<IngestionResult> {
  if (events.length === 0) {
    return { inserted: 0, duplicates: 0, orphans: [], affectedPairs: 0 };
  }

  const bioIds = [...new Set(events.map((e) => e.biometricId))];
  const employees = await EmployeeModel.find({ biometricId: { $in: bioIds } }).lean();
  const empByBio = new Map(employees.map((e) => [e.biometricId, e]));

  const orphans: string[] = [];
  const rawDocs = events
    .filter((e) => {
      if (!empByBio.has(e.biometricId)) {
        orphans.push(e.biometricId);
        return false;
      }
      return true;
    })
    .map((e) => {
      const utcTs = istStringToUtc(e.timestampIst);
      return {
        employeeId: empByBio.get(e.biometricId)!._id,
        biometricId: e.biometricId,
        deviceId: device._id,
        punchType: e.punchType,
        rawTimestamp: utcTs,
        rawDate: utcToIstDateString(utcTs),
        rawPayload: e.vendorPayload,
        receivedAt: new Date(),
        sourceIp,
        vendor: e.vendor,
        parserVersion: e.parserVersion,
        rawProtocol: e.rawProtocol,
        idempotencyKey: e.idempotencyKey,
      };
    });

  let inserted = 0;
  let duplicates = 0;

  if (rawDocs.length > 0) {
    const keys = rawDocs.map((d) => d.idempotencyKey).filter(Boolean) as string[];
    const existing =
      keys.length > 0
        ? await AttendanceRawModel.find({ idempotencyKey: { $in: keys } })
            .select('idempotencyKey')
            .lean()
        : [];
    const existingSet = new Set(existing.map((e) => e.idempotencyKey));
    const toInsert = rawDocs.filter((d) => !d.idempotencyKey || !existingSet.has(d.idempotencyKey));
    duplicates = rawDocs.length - toInsert.length;

    if (toInsert.length > 0) {
      const result = await AttendanceRawModel.insertMany(toInsert, { ordered: false });
      inserted = result.length;
      const pairs = new Set(toInsert.map((d) => `${d.employeeId}:${d.rawDate}`));
      await Promise.all(
        [...pairs].map(async (key) => {
          const [empId, date] = key.split(':') as [string, string];
          await recomputeDerived(new Types.ObjectId(empId), date, 'late_punch_arrived');
        })
      );
    }

    device.lastPingAt = new Date();
    await device.save();
  }

  if (orphans.length > 0) {
    const uniqueOrphans = [...new Set(orphans)];
    await audit(
      'orphan_punch',
      { ipAddress: sourceIp },
      { entityType: 'device', entityId: device._id, payload: { orphans: uniqueOrphans, vendor: device.vendor } }
    );
    logger.warn('orphan_punches_received', {
      serialNumber: device.serialNumber,
      vendor: device.vendor,
      orphans: uniqueOrphans,
    });
  }

  return {
    inserted,
    duplicates,
    orphans: [...new Set(orphans)],
    affectedPairs: inserted > 0 ? new Set(rawDocs.map((d) => `${d.employeeId}:${d.rawDate}`)).size : 0,
  };
}
