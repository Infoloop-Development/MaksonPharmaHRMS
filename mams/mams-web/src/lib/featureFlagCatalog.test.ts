import { describe, it, expect } from 'vitest';
import type { FeatureFlagState } from '@mams/types';
import { filterFeatureFlags, groupFlagsByCategory } from './featureFlagCatalog';

const sampleFlags: FeatureFlagState[] = [
  {
    id: 'unmaskEnabled',
    label: 'Sensitive field unmask',
    description: 'Test',
    category: 'Security',
    riskLevel: 'high',
    source: 'featureFlags',
    serverEnvKey: 'FEATURE_UNMASK_ENABLED',
    webEnvKey: 'VITE_FEATURE_UNMASK_ENABLED',
    affectedAreas: ['Employees'],
    requiresWebRebuild: true,
    enabled: true,
    effectiveSource: 'mongo',
    mongoValue: true,
    envValue: true,
    webBuildDefault: true,
    webSynced: true,
  },
  {
    id: 'autogenDemoEnabled',
    label: 'Autogen shift demo',
    description: 'Test',
    category: 'Demo & Dev',
    riskLevel: 'low',
    source: 'featureFlags',
    serverEnvKey: 'FEATURE_AUTOGEN_DEMO_ENABLED',
    webEnvKey: 'VITE_FEATURE_AUTOGEN_DEMO_ENABLED',
    affectedAreas: ['Navigation'],
    requiresWebRebuild: true,
    enabled: false,
    effectiveSource: 'env',
    mongoValue: null,
    envValue: false,
    webBuildDefault: false,
    webSynced: true,
  },
];

describe('featureFlagCatalog', () => {
  it('filters by search and status', () => {
    const out = filterFeatureFlags(sampleFlags, { search: 'unmask', category: 'all', status: 'on' });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe('unmaskEnabled');
  });

  it('groups by category', () => {
    const grouped = groupFlagsByCategory(sampleFlags);
    expect(grouped.Security).toHaveLength(1);
    expect(grouped['Demo & Dev']).toHaveLength(1);
    expect(grouped.Compliance).toHaveLength(0);
  });
});
