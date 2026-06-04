/** API base used for device integration URLs shown to HR admins. */
export function apiBaseUrl(): string {
  const env = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (env && env.trim()) return env.replace(/\/$/, '');
  return `${window.location.origin.replace(/:\d+$/, ':3001')}`;
}

export function getDeviceIntegrationUrls() {
  const base = apiBaseUrl();
  return {
    base,
    iclockUrl: `${base}/iclock/cdata`,
    hanvonPushUrl: `${base}/integrations/hanvon/push`,
  };
}
