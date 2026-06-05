import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('featureFlags', () => {
  const original = process.env.FEATURE_UNMASK_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.FEATURE_UNMASK_ENABLED;
    else process.env.FEATURE_UNMASK_ENABLED = original;
    vi.resetModules();
  });

  beforeEach(() => {
    vi.resetModules();
  });

  it('isUnmaskEnabled defaults to true when unset', async () => {
    delete process.env.FEATURE_UNMASK_ENABLED;
    const { isUnmaskEnabled } = await import('../src/config/featureFlags.js');
    expect(isUnmaskEnabled()).toBe(true);
  });

  it('isUnmaskEnabled is false when env is false', async () => {
    process.env.FEATURE_UNMASK_ENABLED = 'false';
    const { isUnmaskEnabled, filterPermissionsForSession } = await import('../src/config/featureFlags.js');
    expect(isUnmaskEnabled()).toBe(false);
    expect(filterPermissionsForSession(['read.real', 'unmask.sensitive'])).toEqual(['read.real']);
  });
});

describe('unmaskGrants when feature disabled', () => {
  const original = process.env.FEATURE_UNMASK_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.FEATURE_UNMASK_ENABLED;
    else process.env.FEATURE_UNMASK_ENABLED = original;
    vi.resetModules();
  });

  it('userHasUnmaskGrant returns false', async () => {
    process.env.FEATURE_UNMASK_ENABLED = 'false';
    vi.resetModules();
    const { userHasUnmaskGrant } = await import('../src/services/unmaskGrants.service.js');
    const user = {
      unmaskFieldGrants: ['pan'],
      permissions: ['unmask.sensitive'],
    } as Parameters<typeof userHasUnmaskGrant>[0];
    expect(userHasUnmaskGrant(user, 'pan')).toBe(false);
  });
});
