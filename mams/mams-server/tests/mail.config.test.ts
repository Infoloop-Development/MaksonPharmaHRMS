import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('getAppPublicUrl', () => {
  const originalPublic = process.env.PUBLIC_APP_URL;
  const originalApp = process.env.APP_PUBLIC_URL;

  afterEach(() => {
    if (originalPublic === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = originalPublic;
    if (originalApp === undefined) delete process.env.APP_PUBLIC_URL;
    else process.env.APP_PUBLIC_URL = originalApp;
    vi.resetModules();
  });

  it('prefers PUBLIC_APP_URL over APP_PUBLIC_URL', async () => {
    process.env.PUBLIC_APP_URL = 'https://mams.example.com';
    process.env.APP_PUBLIC_URL = 'https://legacy.example.com';
    vi.resetModules();
    const { getAppPublicUrl } = await import('../src/config/mail.js');
    expect(getAppPublicUrl()).toBe('https://mams.example.com');
  });

  it('falls back to APP_PUBLIC_URL when PUBLIC_APP_URL is unset', async () => {
    delete process.env.PUBLIC_APP_URL;
    process.env.APP_PUBLIC_URL = 'https://legacy.example.com/';
    vi.resetModules();
    const { getAppPublicUrl } = await import('../src/config/mail.js');
    expect(getAppPublicUrl()).toBe('https://legacy.example.com');
  });
});
