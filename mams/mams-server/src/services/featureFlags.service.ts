import type {
  FeatureFlagEffectiveSource,
  FeatureFlagId,
  FeatureFlagsLastUpdated,
  FeatureFlagsPatchBody,
  FeatureFlagsResponse,
  FeatureFlagsSummary,
} from '@mams/types';
import { FEATURE_FLAG_CATALOG, getFeatureFlagCatalogEntry } from '@mams/types';
import mongoose from 'mongoose';
import {
  getCachedFeatureFlagOverrides,
  resolveAutogenDemoEnabled,
  resolveUnmaskEnabled,
  setCachedFeatureFlagOverrides,
  type StoredFeatureFlags,
} from '../config/featureFlags.js';
import { SettingsModel } from '../models/Settings.js';
import { UserModel } from '../models/User.js';
import { audit } from './audit.service.js';
import { diffSettingsValues, settingsSectionFromChangedFields } from './activity.service.js';

type AuditContext = {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
};

function parseEnabled(raw: string | undefined, defaultValue = true): boolean {
  const v = raw?.trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no') return false;
  if (v === 'true' || v === '1' || v === 'yes') return true;
  return defaultValue;
}

function envDefaultForFlag(id: 'unmaskEnabled' | 'autogenDemoEnabled'): boolean {
  if (id === 'unmaskEnabled') return parseEnabled(process.env.FEATURE_UNMASK_ENABLED, true);
  return parseEnabled(process.env.FEATURE_AUTOGEN_DEMO_ENABLED, true);
}

export async function loadFeatureFlagOverrides(): Promise<void> {
  const doc = await SettingsModel.findOne().select('featureFlags').lean();
  const ff = doc?.featureFlags as StoredFeatureFlags | undefined;
  setCachedFeatureFlagOverrides({
    unmaskEnabled: ff?.unmaskEnabled ?? null,
    autogenDemoEnabled: ff?.autogenDemoEnabled ?? null,
    updatedAt: ff?.updatedAt ?? null,
    updatedBy: ff?.updatedBy ?? null,
  });
}

function runtimeFlagState(
  id: 'unmaskEnabled' | 'autogenDemoEnabled',
  mongoValue: boolean | null
): { enabled: boolean; effectiveSource: FeatureFlagEffectiveSource; envValue: boolean } {
  const envValue = envDefaultForFlag(id);
  if (mongoValue !== null && mongoValue !== undefined) {
    return { enabled: mongoValue, effectiveSource: 'mongo', envValue };
  }
  return { enabled: envValue, effectiveSource: 'env', envValue };
}

function buildDeploySnippet(): string {
  const lines = ['# Feature flags — set on Render (API) and Netlify (web build)'];
  for (const entry of FEATURE_FLAG_CATALOG) {
    if (entry.serverEnvKey) {
      const enabled = entry.id === 'unmaskEnabled' ? resolveUnmaskEnabled() : resolveAutogenDemoEnabled();
      lines.push(`${entry.serverEnvKey}=${enabled ? 'true' : 'false'}`);
    }
    if (entry.webEnvKey) {
      const enabled = entry.id === 'unmaskEnabled' ? resolveUnmaskEnabled() : resolveAutogenDemoEnabled();
      lines.push(`${entry.webEnvKey}=${enabled ? 'true' : 'false'}`);
    }
  }
  return lines.join('\n');
}

function computeSummary(flags: FeatureFlagsResponse['flags']): FeatureFlagsSummary {
  const warnings = flags.filter((f) => f.webSynced === false).length;
  const enabled = flags.filter((f) => f.enabled).length;
  return {
    total: flags.length,
    enabled,
    disabled: flags.length - enabled,
    warnings,
  };
}

async function resolveLastUpdated(): Promise<FeatureFlagsLastUpdated> {
  const cached = getCachedFeatureFlagOverrides();
  const at = cached.updatedAt;
  if (!at) return null;
  let byName: string | undefined;
  const byUserId = cached.updatedBy?.toString();
  if (byUserId) {
    const user = await UserModel.findById(byUserId).select('name').lean();
    byName = user?.name ?? undefined;
  }
  return {
    at: at instanceof Date ? at.toISOString() : String(at),
    byUserId,
    byName,
  };
}

export async function getFeatureFlagsResponse(): Promise<FeatureFlagsResponse> {
  const doc = await SettingsModel.findOne().lean();
  const settings = doc as Record<string, unknown> | null;
  const cached = getCachedFeatureFlagOverrides();

  const flags = FEATURE_FLAG_CATALOG.map((entry) => {
    if (entry.source === 'featureFlags') {
      const mongoValue =
        entry.id === 'unmaskEnabled' ? cached.unmaskEnabled ?? null : cached.autogenDemoEnabled ?? null;
      const { enabled, effectiveSource, envValue } = runtimeFlagState(entry.id, mongoValue);
      return {
        ...entry,
        enabled,
        effectiveSource,
        mongoValue,
        envValue,
        webBuildDefault: envValue,
        webSynced: null,
      };
    }

    const field = entry.settingsField!;
    const enabled = Boolean(settings?.[field] ?? true);
    return {
      ...entry,
      enabled,
      effectiveSource: 'settings' as FeatureFlagEffectiveSource,
      mongoValue: null,
      envValue: null,
      webBuildDefault: null,
      webSynced: null,
    };
  });

  return {
    flags,
    summary: computeSummary(flags),
    lastUpdated: await resolveLastUpdated(),
    deploySnippet: buildDeploySnippet(),
  };
}

async function patchRuntimeFlag(
  id: 'unmaskEnabled' | 'autogenDemoEnabled',
  enabled: boolean,
  auditCtx: AuditContext
): Promise<void> {
  let doc = await SettingsModel.findOne();
  if (!doc) doc = await SettingsModel.create({});

  const cached = getCachedFeatureFlagOverrides();
  const before = id === 'unmaskEnabled' ? cached.unmaskEnabled : cached.autogenDemoEnabled;

  const ff = (doc as { featureFlags?: StoredFeatureFlags }).featureFlags ?? {
    unmaskEnabled: null,
    autogenDemoEnabled: null,
  };
  if (id === 'unmaskEnabled') ff.unmaskEnabled = enabled;
  else ff.autogenDemoEnabled = enabled;
  ff.updatedAt = new Date();
  ff.updatedBy = new mongoose.Types.ObjectId(auditCtx.userId);
  (doc as { featureFlags: StoredFeatureFlags }).featureFlags = ff;
  await doc.save();

  setCachedFeatureFlagOverrides({
    unmaskEnabled: ff.unmaskEnabled ?? null,
    autogenDemoEnabled: ff.autogenDemoEnabled ?? null,
    updatedAt: ff.updatedAt,
    updatedBy: ff.updatedBy ?? null,
  });

  await audit('feature_flags_changed', auditCtx, {
    entityType: 'settings',
    payload: { flagId: id, from: before, to: enabled },
  });
}

async function patchSettingsFlag(
  field: 'smartAnchorEnabled' | 'confidentialityNoticeEnabled',
  enabled: boolean,
  auditCtx: AuditContext
): Promise<void> {
  let doc = await SettingsModel.findOne();
  if (!doc) doc = await SettingsModel.create({});

  const docBefore = doc.toObject() as Record<string, unknown>;
  const patch = { [field]: enabled };
  const { before, after, changedFields } = diffSettingsValues(docBefore, patch);

  (doc as Record<string, unknown>)[field] = enabled;
  await doc.save();

  if (changedFields.length > 0) {
    await audit('settings_changed', auditCtx, {
      entityType: 'settings',
      entityId: doc._id,
      payload: {
        before,
        after,
        changedFields,
        section: settingsSectionFromChangedFields(changedFields),
        via: 'feature_flags_console',
      },
    });
  }
}

export async function patchFeatureFlags(
  body: FeatureFlagsPatchBody,
  auditCtx: AuditContext
): Promise<FeatureFlagsResponse> {
  const changes: Partial<Record<FeatureFlagId, boolean>> =
    'changes' in body ? body.changes : { [body.flagId]: body.enabled };

  for (const [flagId, enabled] of Object.entries(changes) as [FeatureFlagId, boolean][]) {
    const entry = getFeatureFlagCatalogEntry(flagId);
    if (entry.source === 'featureFlags') {
      await patchRuntimeFlag(flagId as 'unmaskEnabled' | 'autogenDemoEnabled', enabled, auditCtx);
    } else if (entry.settingsField) {
      await patchSettingsFlag(entry.settingsField, enabled, auditCtx);
    }
  }

  return getFeatureFlagsResponse();
}
