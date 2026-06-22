import { deviceIntegrationRootUrl } from '../../api/apiBase';

/** API base used for device integration URLs shown to HR admins. */
export function apiBaseUrl(): string {
  return deviceIntegrationRootUrl();
}

export function getDeviceIntegrationUrls() {
  const base = apiBaseUrl();
  return {
    base,
    iclockUrl: `${base}/iclock/cdata`,
    hanvonPushUrl: `${base}/integrations/hanvon/push`,
  };
}
