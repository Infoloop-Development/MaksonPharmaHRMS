import type {
  FeatureFlagCategory,
  FeatureFlagId,
  FeatureFlagRiskLevel,
  FeatureFlagState,
  FeatureFlagsResponse,
} from '@mams/types';
import { FEATURE_FLAG_CATEGORIES } from '@mams/types';

export type FeatureFlagStatusFilter = 'all' | 'on' | 'off';

function parseWebEnv(raw: string | undefined, defaultValue: boolean): boolean {
  const v = raw?.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return defaultValue;
}

export function webBuildValueForFlag(flag: FeatureFlagState): boolean | null {
  if (!flag.webEnvKey) return null;
  if (flag.id === 'unmaskEnabled') {
    return parseWebEnv(import.meta.env.VITE_FEATURE_UNMASK_ENABLED as string | undefined, true);
  }
  if (flag.id === 'autogenDemoEnabled') {
    return parseWebEnv(import.meta.env.VITE_FEATURE_AUTOGEN_DEMO_ENABLED as string | undefined, true);
  }
  return null;
}

export function enrichFeatureFlagsResponse(data: FeatureFlagsResponse): FeatureFlagsResponse {
  const flags = data.flags.map((flag) => {
    const webBuild = webBuildValueForFlag(flag);
    const webSynced = webBuild === null ? null : flag.enabled === webBuild;
    return { ...flag, webBuildDefault: webBuild, webSynced };
  });
  const warnings = flags.filter((f) => f.webSynced === false).length;
  return {
    ...data,
    flags,
    summary: {
      ...data.summary,
      warnings,
    },
  };
}

export function filterFeatureFlags(
  flags: FeatureFlagState[],
  opts: {
    search: string;
    category: FeatureFlagCategory | 'all';
    status: FeatureFlagStatusFilter;
  }
): FeatureFlagState[] {
  const q = opts.search.trim().toLowerCase();
  return flags.filter((flag) => {
    if (opts.category !== 'all' && flag.category !== opts.category) return false;
    if (opts.status === 'on' && !flag.enabled) return false;
    if (opts.status === 'off' && flag.enabled) return false;
    if (!q) return true;
    const haystack = [
      flag.label,
      flag.description,
      flag.category,
      flag.serverEnvKey,
      flag.webEnvKey,
      ...flag.affectedAreas,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function groupFlagsByCategory(
  flags: FeatureFlagState[]
): Record<FeatureFlagCategory, FeatureFlagState[]> {
  const out = FEATURE_FLAG_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = [];
      return acc;
    },
    {} as Record<FeatureFlagCategory, FeatureFlagState[]>
  );
  for (const flag of flags) {
    out[flag.category].push(flag);
  }
  return out;
}

export function riskLabel(risk: FeatureFlagRiskLevel): string {
  if (risk === 'high') return 'High risk';
  if (risk === 'medium') return 'Medium risk';
  return 'Low risk';
}

export function sourceLabel(source: FeatureFlagState['effectiveSource']): string {
  if (source === 'mongo') return 'MongoDB';
  if (source === 'env') return 'Env default';
  if (source === 'settings') return 'Organization settings';
  return 'Default';
}

export function flagKey(flag: FeatureFlagState): FeatureFlagId {
  return flag.id;
}
