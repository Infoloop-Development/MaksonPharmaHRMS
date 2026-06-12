import type { Settings } from '../api/settings';

export type CompanyBranding = {
  companyName: string;
  companyLogo: string | null;
  registeredAddress: string;
  signatoryName: string;
  signatoryDesignation: string;
  confidentialityNoticeEnabled: boolean;
  confidentialityNoticeText: string;
};

const DEFAULT_COMPANY_NAME = 'Makson Pharmaceuticals (India) Pvt. Ltd.';
const DEFAULT_ADDRESS =
  '195, Rajkot Highway, Surendranagar, Wadhwancity, Gujarat 363020';
const DEFAULT_CONFIDENTIALITY =
  'This system contains confidential employee data. Unauthorised access is prohibited.';

export function brandingFromSettings(settings?: Settings | null): CompanyBranding {
  return {
    companyName: settings?.companyName?.trim() || DEFAULT_COMPANY_NAME,
    companyLogo: settings?.companyLogo ?? null,
    registeredAddress: settings?.registeredAddress?.trim() || DEFAULT_ADDRESS,
    signatoryName: settings?.signatoryName?.trim() || '',
    signatoryDesignation: settings?.signatoryDesignation?.trim() || '',
    confidentialityNoticeEnabled: settings?.confidentialityNoticeEnabled ?? true,
    confidentialityNoticeText:
      settings?.confidentialityNoticeText?.trim() || DEFAULT_CONFIDENTIALITY,
  };
}
