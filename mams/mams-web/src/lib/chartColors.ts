export type ChartColorPalette = {
  navy: string;
  presentInactive: string;
  red: string;
  redInactive: string;
  amber: string;
  amberInactive: string;
  muted: string;
  text: string;
  border: string;
  green: string;
  indigo?: string;
  purple?: string;
};

export function getChartColors(isDark: boolean): ChartColorPalette {
  if (isDark) {
    return {
      navy: '#5b7fd4',
      presentInactive: '#3d4f6f',
      red: '#f04a4a',
      redInactive: '#6b3030',
      amber: '#fbbf24',
      amberInactive: '#5c4520',
      muted: '#7a8699',
      text: '#e8eaf0',
      border: '#2e3648',
      green: '#86efac',
      indigo: '#818cf8',
      purple: '#818cf8',
    };
  }
  return {
    navy: '#1A2878',
    presentInactive: '#B0BFD8',
    red: '#E82C2C',
    redInactive: '#f5a8a8',
    amber: '#f59e0b',
    amberInactive: '#fcd9a0',
    muted: '#8492a6',
    text: '#1a1f36',
    border: '#e2e6ed',
    green: '#73ae25',
    indigo: '#6366f1',
    purple: '#6366f1',
  };
}

/** @deprecated use getChartColors(isDark) */
export const CHART_COLORS = getChartColors(false);

export type AnalyticsColors = {
  navy: string;
  green: string;
  red: string;
  amber: string;
  purple: string;
  muted: string;
  border: string;
  inactive: string;
  text: string;
};

export function getAnalyticsColors(isDark: boolean): AnalyticsColors {
  const c = getChartColors(isDark);
  return {
    navy: c.navy,
    green: c.green,
    red: c.red,
    amber: c.amber,
    purple: c.purple ?? c.indigo ?? c.navy,
    muted: c.muted,
    border: c.border,
    inactive: c.presentInactive,
    text: c.text,
  };
}
