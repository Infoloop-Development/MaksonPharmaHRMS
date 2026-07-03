import { normalizeOrgBranding, type OrgBranding } from '@mams/types';
import { SettingsModel } from '../models/Settings.js';

const DEFAULT_COMPANY_NAME = 'Makson Group';

export type PublicOrgBranding = {
  companyName: string;
  companyLogo: string | null;
  favicon: string | null;
  orgBranding: OrgBranding;
};

export async function getPublicOrgBranding(): Promise<PublicOrgBranding> {
  const doc = await SettingsModel.findOne().lean();
  return {
    companyName: doc?.companyName?.trim() || DEFAULT_COMPANY_NAME,
    companyLogo: doc?.companyLogo ?? null,
    favicon: doc?.favicon ?? null,
    orgBranding: normalizeOrgBranding(doc?.orgBranding as Partial<OrgBranding> | undefined),
  };
}
