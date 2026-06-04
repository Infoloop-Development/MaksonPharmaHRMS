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
}

export const settingsApi = {
  get: () => api.get<Settings>('/settings'),
  patch: (body: Partial<Settings>) => api.patch<Settings>('/settings', body),
};
