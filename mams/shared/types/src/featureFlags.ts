import { z } from 'zod';

export const FeatureFlagIdSchema = z.enum([
  'unmaskEnabled',
  'autogenDemoEnabled',
  'smartAnchorEnabled',
  'confidentialityNoticeEnabled',
]);
export type FeatureFlagId = z.infer<typeof FeatureFlagIdSchema>;

export type FeatureFlagCategory = 'Security' | 'Demo & Dev' | 'HR Engine' | 'Compliance';
export type FeatureFlagRiskLevel = 'high' | 'medium' | 'low';
export type FeatureFlagSource = 'featureFlags' | 'settings';
export type FeatureFlagEffectiveSource = 'mongo' | 'env' | 'default' | 'settings';

export type FeatureFlagCatalogEntry = {
  id: FeatureFlagId;
  label: string;
  description: string;
  category: FeatureFlagCategory;
  riskLevel: FeatureFlagRiskLevel;
  source: FeatureFlagSource;
  serverEnvKey?: string;
  webEnvKey?: string;
  settingsField?: 'smartAnchorEnabled' | 'confidentialityNoticeEnabled';
  affectedAreas: string[];
  requiresWebRebuild: boolean;
  impactBullets?: string[];
};

export const FEATURE_FLAG_CATEGORIES: FeatureFlagCategory[] = [
  'Security',
  'Demo & Dev',
  'HR Engine',
  'Compliance',
];

export const FEATURE_FLAG_CATALOG: FeatureFlagCatalogEntry[] = [
  {
    id: 'unmaskEnabled',
    label: 'Sensitive field unmask',
    description:
      'Allows HR admins to reveal masked PAN, Aadhaar, and other sensitive employee fields. Disabling removes unmask API access and session permissions.',
    category: 'Security',
    riskLevel: 'high',
    source: 'featureFlags',
    serverEnvKey: 'FEATURE_UNMASK_ENABLED',
    webEnvKey: 'VITE_FEATURE_UNMASK_ENABLED',
    affectedAreas: ['Employees', 'User grants', 'Sessions', 'API'],
    requiresWebRebuild: true,
    impactBullets: [
      'Unmask buttons and grants UI will be hidden for all users.',
      'Existing unmask API requests will return feature_disabled.',
      'Users with unmask.sensitive permission lose effective access until re-enabled.',
    ],
  },
  {
    id: 'autogenDemoEnabled',
    label: 'Autogen shift demo',
    description:
      'Shows the Auto Generated Shift Demo navigation item and route for internal demonstrations.',
    category: 'Demo & Dev',
    riskLevel: 'low',
    source: 'featureFlags',
    serverEnvKey: 'FEATURE_AUTOGEN_DEMO_ENABLED',
    webEnvKey: 'VITE_FEATURE_AUTOGEN_DEMO_ENABLED',
    affectedAreas: ['Navigation', 'Routes'],
    requiresWebRebuild: true,
    impactBullets: ['Demo nav link and /autogeneration-demo route visibility changes after web rebuild.'],
  },
  {
    id: 'smartAnchorEnabled',
    label: 'Smart anchor engine',
    description:
      'Enables intelligent attendance anchor resolution for punch matching. Managed alongside organization HR settings.',
    category: 'HR Engine',
    riskLevel: 'medium',
    source: 'settings',
    settingsField: 'smartAnchorEnabled',
    affectedAreas: ['Attendance', 'Punch matching'],
    requiresWebRebuild: false,
    impactBullets: ['Attendance anchor logic uses standard rules when disabled.'],
  },
  {
    id: 'confidentialityNoticeEnabled',
    label: 'Export confidentiality notice',
    description:
      'Prints a confidentiality notice on exported reports and documents. Notice text is edited under Organization settings.',
    category: 'Compliance',
    riskLevel: 'low',
    source: 'settings',
    settingsField: 'confidentialityNoticeEnabled',
    affectedAreas: ['Reports', 'Exports', 'Print'],
    requiresWebRebuild: false,
    impactBullets: ['Exports will omit the confidentiality footer when disabled.'],
  },
];

export function getFeatureFlagCatalogEntry(id: FeatureFlagId): FeatureFlagCatalogEntry {
  const entry = FEATURE_FLAG_CATALOG.find((f) => f.id === id);
  if (!entry) throw new Error(`Unknown feature flag: ${id}`);
  return entry;
}

export type FeatureFlagState = FeatureFlagCatalogEntry & {
  enabled: boolean;
  effectiveSource: FeatureFlagEffectiveSource;
  mongoValue: boolean | null;
  envValue: boolean | null;
  webBuildDefault: boolean | null;
  webSynced: boolean | null;
};

export type FeatureFlagsSummary = {
  total: number;
  enabled: number;
  disabled: number;
  warnings: number;
};

export type FeatureFlagsLastUpdated = {
  at: string;
  byUserId?: string;
  byName?: string;
} | null;

export type FeatureFlagsResponse = {
  flags: FeatureFlagState[];
  summary: FeatureFlagsSummary;
  lastUpdated: FeatureFlagsLastUpdated;
  deploySnippet: string;
};

export const FeatureFlagsPatchSchema = z
  .object({
    flagId: FeatureFlagIdSchema,
    enabled: z.boolean(),
  })
  .or(
    z.object({
      changes: z.record(FeatureFlagIdSchema, z.boolean()),
    })
  );

export type FeatureFlagsPatchBody = z.infer<typeof FeatureFlagsPatchSchema>;
