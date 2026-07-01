import { describe, expect, it } from 'vitest';
import { sanitizeNetworkBody } from './networkBuffer';

describe('sanitizeNetworkBody', () => {
  it('redacts JWT tokens in JSON bodies', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const out = sanitizeNetworkBody({ error: 'unauthorized', token });
    expect(out).not.toContain(token);
    expect(out).toContain('[REDACTED_JWT]');
  });

  it('redacts Authorization header patterns', () => {
    const out = sanitizeNetworkBody('{"Authorization":"Bearer secret-token"}');
    expect(out).toContain('[REDACTED]');
    expect(out).not.toContain('secret-token');
  });
});
