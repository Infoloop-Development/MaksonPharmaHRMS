import type { ExportNamingSettings, OrgBranding, OrgNotificationAlerts, TimeFormat } from '@mams/types';
import { resolveOrgNotificationAlerts } from '@mams/types';
import { api } from './client';

export interface ShiftWindow {
  id: string;
  start: string;
  end: string;
  label: string;
}

export interface Settings {
  _id: string;
  companyName: string;
  cin: string;
  gstin: string;
  pfRegistrationNumber: string;
  esiRegistrationNumber: string;
  factoryLicenceNumber: string;
  registeredAddress: string;
  signatoryName: string;
  signatoryDesignation: string;
  weeklyOffDefault: string[];
  realShifts: ShiftWindow[];
  complianceShifts: ShiftWindow[];
  smartAnchorEnabled: boolean;
  smartAnchorVersion: string;
  confidentialityNoticeEnabled: boolean;
  confidentialityNoticeText: string;
  exportNaming?: ExportNamingSettings;
  timeFormat: TimeFormat;
  companyLogo: string | null;
  favicon: string | null;
  orgBranding?: OrgBranding & { updatedAt?: string | null; updatedBy?: string | null };
  orgNotificationAlerts?: OrgNotificationAlerts;
}

export function settingsOrgNotificationAlerts(settings: Settings): OrgNotificationAlerts {
  return resolveOrgNotificationAlerts(settings.orgNotificationAlerts);
}

export const settingsApi = {
  get: () => api.get<Settings>('/settings'),
  patch: (body: Partial<Settings>) => api.patch<Settings>('/settings', body),
};
