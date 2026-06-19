import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { setCachedFeatureFlagOverrides, resolveUnmaskEnabled } from '../src/config/featureFlags.js';

const findOne = vi.fn();
const findOneLean = vi.fn();
const create = vi.fn();
const findById = vi.fn();
const audit = vi.fn();

vi.mock('../src/models/Settings.js', () => ({
  SettingsModel: {
    findOne: (...args: unknown[]) => {
      const chain = {
        select: () => ({ lean: () => findOneLean(...args) }),
        lean: () => findOneLean(...args),
      };
      return Object.assign(Promise.resolve(findOne(...args)), chain);
    },
    create: (...args: unknown[]) => create(...args),
  },
}));

vi.mock('../src/models/User.js', () => ({
  UserModel: {
    findById: () => ({
      select: () => ({
        lean: () => findById(),
      }),
    }),
  },
}));

vi.mock('../src/services/audit.service.js', () => ({
  audit: (...args: unknown[]) => audit(...args),
}));

vi.mock('../src/services/activity.service.js', () => ({
  diffSettingsValues: (before: Record<string, unknown>, patch: Record<string, unknown>) => {
    const changedFields = Object.keys(patch);
    return {
      before,
      after: { ...before, ...patch },
      changedFields,
    };
  },
  settingsSectionFromChangedFields: () => 'smart_anchor',
}));

const { patchFeatureFlags, getFeatureFlagsResponse } = await import(
  '../src/services/featureFlags.service.js'
);

describe('featureFlags.service', () => {
  const originalUnmask = process.env.FEATURE_UNMASK_ENABLED;
  const originalAutogen = process.env.FEATURE_AUTOGEN_DEMO_ENABLED;

  afterEach(() => {
    if (originalUnmask === undefined) delete process.env.FEATURE_UNMASK_ENABLED;
    else process.env.FEATURE_UNMASK_ENABLED = originalUnmask;
    if (originalAutogen === undefined) delete process.env.FEATURE_AUTOGEN_DEMO_ENABLED;
    else process.env.FEATURE_AUTOGEN_DEMO_ENABLED = originalAutogen;
    vi.clearAllMocks();
    setCachedFeatureFlagOverrides({ unmaskEnabled: null, autogenDemoEnabled: null });
  });

  beforeEach(() => {
    process.env.FEATURE_UNMASK_ENABLED = 'true';
    process.env.FEATURE_AUTOGEN_DEMO_ENABLED = 'true';
    setCachedFeatureFlagOverrides({ unmaskEnabled: null, autogenDemoEnabled: null });
    findOneLean.mockResolvedValue({
      smartAnchorEnabled: true,
      confidentialityNoticeEnabled: true,
      featureFlags: { unmaskEnabled: null, autogenDemoEnabled: null },
    });
  });

  it('mongo override beats env for unmask', () => {
    process.env.FEATURE_UNMASK_ENABLED = 'true';
    setCachedFeatureFlagOverrides({ unmaskEnabled: false, autogenDemoEnabled: null });
    expect(resolveUnmaskEnabled()).toBe(false);
  });

  it('falls back to env when mongo is null', () => {
    process.env.FEATURE_UNMASK_ENABLED = 'false';
    setCachedFeatureFlagOverrides({ unmaskEnabled: null, autogenDemoEnabled: null });
    expect(resolveUnmaskEnabled()).toBe(false);
  });

  it('getFeatureFlagsResponse returns catalog flags', async () => {
    const res = await getFeatureFlagsResponse();
    expect(res.flags).toHaveLength(4);
    expect(res.summary.total).toBe(4);
    expect(res.deploySnippet).toContain('FEATURE_UNMASK_ENABLED');
  });

  it('patchFeatureFlags persists runtime flag and audits', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    findOne.mockResolvedValue({
      featureFlags: { unmaskEnabled: null, autogenDemoEnabled: null },
      save,
      toObject: () => ({ smartAnchorEnabled: true, confidentialityNoticeEnabled: true }),
    });
    create.mockResolvedValue({
      featureFlags: {},
      save,
      toObject: () => ({}),
    });

    const res = await patchFeatureFlags(
      { flagId: 'unmaskEnabled', enabled: false },
      { userId: new mongoose.Types.ObjectId().toString(), ipAddress: null, userAgent: null }
    );

    expect(save).toHaveBeenCalled();
    expect(audit).toHaveBeenCalledWith(
      'feature_flags_changed',
      expect.any(Object),
      expect.objectContaining({ payload: expect.objectContaining({ flagId: 'unmaskEnabled' }) })
    );
    expect(res.flags.find((f) => f.id === 'unmaskEnabled')?.enabled).toBe(false);
    expect(resolveUnmaskEnabled()).toBe(false);
  });

  it('patchFeatureFlags updates settings-linked flag', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    findOne.mockResolvedValue({
      smartAnchorEnabled: true,
      confidentialityNoticeEnabled: true,
      featureFlags: {},
      save,
      toObject: () => ({ smartAnchorEnabled: true, confidentialityNoticeEnabled: true }),
      _id: 'settings1',
    });

    await patchFeatureFlags(
      { flagId: 'smartAnchorEnabled', enabled: false },
      { userId: '507f1f77bcf86cd799439011', ipAddress: null, userAgent: null }
    );

    expect(save).toHaveBeenCalled();
    expect(audit).toHaveBeenCalledWith('settings_changed', expect.any(Object), expect.any(Object));
  });
});

describe('featureFlags config', () => {
  afterEach(() => {
    setCachedFeatureFlagOverrides({ unmaskEnabled: null, autogenDemoEnabled: null });
  });

  it('isAutogenDemoEnabled respects mongo cache', async () => {
    setCachedFeatureFlagOverrides({ unmaskEnabled: null, autogenDemoEnabled: false });
    const { isAutogenDemoEnabled } = await import('../src/config/featureFlags.js');
    expect(isAutogenDemoEnabled()).toBe(false);
  });
});
