import type { VisitorVisitAccess, VisitorVisitAccessMode } from './visitor.js';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DEFAULT_END_HOUR = 18;
const DEFAULT_END_MINUTE = 0;

function toIstParts(d: Date) {
  const t = d.getTime() + IST_OFFSET_MS;
  const x = new Date(t);
  return {
    year: x.getUTCFullYear(),
    month: x.getUTCMonth(),
    day: x.getUTCDate(),
    hour: x.getUTCHours(),
    minute: x.getUTCMinutes(),
  };
}

function fromIstParts(year: number, month: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(year, month, day, hour, minute, 0, 0) - IST_OFFSET_MS);
}

function parseDateParts(dateStr: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) throw new Error('Invalid date');
  return { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) };
}

function parseTimeParts(timeStr: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!m) throw new Error('Invalid time');
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

/** 18:00 IST today, or tomorrow if already past 18:00 IST. */
export function defaultVisitValidUntil(now: Date): Date {
  const p = toIstParts(now);
  const nowMins = p.hour * 60 + p.minute;
  const endMins = DEFAULT_END_HOUR * 60 + DEFAULT_END_MINUTE;
  if (nowMins >= endMins) {
    const next = new Date(Date.UTC(p.year, p.month, p.day + 1));
    return fromIstParts(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate(), DEFAULT_END_HOUR, DEFAULT_END_MINUTE);
  }
  return fromIstParts(p.year, p.month, p.day, DEFAULT_END_HOUR, DEFAULT_END_MINUTE);
}

export type ResolvedVisitAccess = {
  visitValidUntil: Date;
  visitAccessMode: VisitorVisitAccessMode;
  visitDurationHours: number | null;
};

export function resolveVisitValidUntil(
  visitAccess: VisitorVisitAccess | undefined,
  decidedAt: Date
): ResolvedVisitAccess {
  const access = visitAccess ?? { mode: 'default' as const };

  if (access.mode === 'default') {
    return {
      visitValidUntil: defaultVisitValidUntil(decidedAt),
      visitAccessMode: 'default',
      visitDurationHours: null,
    };
  }

  if (access.mode === 'duration') {
    return {
      visitValidUntil: new Date(decidedAt.getTime() + access.durationHours * 60 * 60 * 1000),
      visitAccessMode: 'duration',
      visitDurationHours: access.durationHours,
    };
  }

  const { year, month, day } = parseDateParts(access.validUntilDate);
  const { hour, minute } = parseTimeParts(access.validUntilTime);
  return {
    visitValidUntil: fromIstParts(year, month, day, hour, minute),
    visitAccessMode: 'until',
    visitDurationHours: null,
  };
}
