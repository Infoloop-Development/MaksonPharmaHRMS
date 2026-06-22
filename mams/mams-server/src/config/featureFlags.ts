import type { Permission } from '@mams/types';

type StoredFeatureFlags = {
  unmaskEnabled: boolean | null;
  autogenDemoEnabled: boolean | null;
  updatedAt?: Date | null;
  updatedBy?: { toString(): string } | null;
};

let cachedOverrides: StoredFeatureFlags = {
  unmaskEnabled: null,
  autogenDemoEnabled: null,
};

function parseEnabled(raw: string | undefined, defaultValue = true): boolean {
  const v = raw?.trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no') return false;
  if (v === 'true' || v === '1' || v === 'yes') return true;
  return defaultValue;
}

export function getCachedFeatureFlagOverrides(): StoredFeatureFlags {
  return cachedOverrides;
}

export function setCachedFeatureFlagOverrides(overrides: StoredFeatureFlags): void {
  cachedOverrides = overrides;
  if (overrides.unmaskEnabled !== null && overrides.unmaskEnabled !== undefined) {
    process.env.FEATURE_UNMASK_ENABLED = overrides.unmaskEnabled ? 'true' : 'false';
  }
  if (overrides.autogenDemoEnabled !== null && overrides.autogenDemoEnabled !== undefined) {
    process.env.FEATURE_AUTOGEN_DEMO_ENABLED = overrides.autogenDemoEnabled ? 'true' : 'false';
  }
}

export function resolveUnmaskEnabled(): boolean {
  const mongo = cachedOverrides.unmaskEnabled;
  if (mongo !== null && mongo !== undefined) return mongo;
  return parseEnabled(process.env.FEATURE_UNMASK_ENABLED, true);
}

export function resolveAutogenDemoEnabled(): boolean {
  const mongo = cachedOverrides.autogenDemoEnabled;
  if (mongo !== null && mongo !== undefined) return mongo;
  return parseEnabled(process.env.FEATURE_AUTOGEN_DEMO_ENABLED, true);
}

/** When false, unmask API, grants UI, and session unmask permission are disabled (demo mode). Default: true. */
export function isUnmaskEnabled(): boolean {
  return resolveUnmaskEnabled();
}

/** When false, autogen demo routes are disabled server-side checks. Default: true. */
export function isAutogenDemoEnabled(): boolean {
  return resolveAutogenDemoEnabled();
}

export function filterPermissionsForSession(permissions: Permission[]): Permission[] {
  if (isUnmaskEnabled()) return permissions;
  return permissions.filter((p) => p !== 'unmask.sensitive');
}

export type { StoredFeatureFlags };
