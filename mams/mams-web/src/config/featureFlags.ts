function parseEnabled(raw: string | undefined, defaultValue: boolean): boolean {
  const v = raw?.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return defaultValue;
}

/** When false, unmask UI and API usage are hidden. Default: true. */
export function isUnmaskEnabled(): boolean {
  return parseEnabled(import.meta.env.VITE_FEATURE_UNMASK_ENABLED as string | undefined, true);
}

/** When false, autogeneration demo nav and route are hidden. Default: true. */
export function isAutogenDemoEnabled(): boolean {
  return parseEnabled(import.meta.env.VITE_FEATURE_AUTOGEN_DEMO_ENABLED as string | undefined, true);
}
