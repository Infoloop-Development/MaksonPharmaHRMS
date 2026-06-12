import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { TimeFormat } from '@mams/types';
import {
  TIME_INPUT_HINTS,
  formatHhmm,
  formatIstDateTimeMs,
  formatIstInstant,
  formatStampString,
} from '../lib/timeFormat';

type TimeDisplayContextValue = {
  format: TimeFormat;
  fmtTime: (d: Date | string | null) => string;
  fmtDateTimeMs: (d: Date | string | null) => string;
  fmtHhmm: (hhmm: string | null | undefined) => string;
  fmtStamp: (stamp: string | null | undefined) => string;
  inputHint: string;
};

const TimeDisplayContext = createContext<TimeDisplayContextValue | null>(null);

export function TimeFormatProvider({
  format = '12h',
  children,
}: {
  format?: TimeFormat;
  children: ReactNode;
}) {
  const value = useMemo<TimeDisplayContextValue>(
    () => ({
      format,
      fmtTime: (d) => formatIstInstant(d, format),
      fmtDateTimeMs: (d) => formatIstDateTimeMs(d, format),
      fmtHhmm: (hhmm) => formatHhmm(hhmm, format),
      fmtStamp: (stamp) => formatStampString(stamp, format),
      inputHint: TIME_INPUT_HINTS[format],
    }),
    [format]
  );

  return <TimeDisplayContext.Provider value={value}>{children}</TimeDisplayContext.Provider>;
}

export function useTimeDisplay(): TimeDisplayContextValue {
  const ctx = useContext(TimeDisplayContext);
  if (!ctx) {
    const fallback: TimeFormat = '12h';
    return {
      format: fallback,
      fmtTime: (d) => formatIstInstant(d, fallback),
      fmtDateTimeMs: (d) => formatIstDateTimeMs(d, fallback),
      fmtHhmm: (hhmm) => formatHhmm(hhmm, fallback),
      fmtStamp: (stamp) => formatStampString(stamp, fallback),
      inputHint: TIME_INPUT_HINTS[fallback],
    };
  }
  return ctx;
}
