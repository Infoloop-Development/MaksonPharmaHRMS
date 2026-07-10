/** Strip integration secrets from device documents returned to clients. */
export function sanitizeDeviceForClient<T extends Record<string, unknown>>(device: T): T {
  const { integrationConfig, ...rest } = device;
  const ic = integrationConfig as Record<string, unknown> | null | undefined;
  const safeConfig = ic
    ? {
        pullBaseUrl: ic.pullBaseUrl ?? null,
        hasPushToken: Boolean(ic.pushToken),
        hasApiKey: Boolean(ic.apiKey),
      }
    : null;
  return { ...rest, integrationConfig: safeConfig } as unknown as T;
}
