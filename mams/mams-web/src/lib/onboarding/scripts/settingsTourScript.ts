import type { TourScript } from '../tourTypes';
import { tourElementExists } from '../tourDom';

export const settingsTourScript: TourScript = {
  phases: [
    {
      id: 'overview',
      steps: [
        {
          id: 'settings-header',
          title: 'System settings',
          description:
            'Company-wide configuration. Changes are audit-logged when you have manage.settings permission.',
          side: 'bottom',
        },
        {
          id: 'settings-leave-link',
          title: 'Leave configuration',
          description: 'Leave types, holidays, and quotas are on the Leave page; use this shortcut to jump there.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'display',
      steps: [
        {
          id: 'settings-time-branding',
          title: 'Time and branding',
          description:
            'Set 12h/24h time display. Upload logo and company name used on reports, exports, and visitor QR stickers.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'company',
      steps: [
        {
          id: 'settings-company',
          title: 'Company info',
          description: 'Legal name, address, and signatory details shown on reports and compliance exports.',
          side: 'bottom',
        },
        {
          id: 'settings-compliance',
          title: 'Compliance identifiers',
          description: 'CIN, GSTIN, PF, ESI, and factory licence numbers used on compliance exports and filings.',
          side: 'bottom',
          when: () => tourElementExists('settings-compliance'),
        },
        {
          id: 'settings-smart-anchor',
          title: 'Smart Anchor v2',
          description:
            'Enable deterministic compliance punch pairing within the 8-hour window. Engine version is shown for audit reference.',
          side: 'bottom',
          when: () => tourElementExists('settings-smart-anchor'),
        },
        {
          id: 'settings-confidentiality',
          title: 'Confidentiality',
          description:
            'Policies for masking sensitive employee fields (PAN, bank, Aadhaar) and who can unmask them.',
          side: 'bottom',
          when: () => tourElementExists('settings-confidentiality'),
        },
      ],
    },
    {
      id: 'shifts',
      steps: [
        {
          id: 'settings-shifts',
          title: 'Shift windows',
          description:
            'Day and Night shift start/end times (IST) drive attendance calculations and outside-shift clock-in flags.',
          side: 'top',
        },
        {
          id: 'settings-export-naming',
          title: 'Export filenames',
          description: 'Configure token-based filename patterns for CSV and report downloads per export type.',
          side: 'top',
          when: () => tourElementExists('settings-export-naming'),
        },
      ],
    },
    {
      id: 'admin',
      steps: [
        {
          id: 'settings-users',
          title: 'User management',
          description:
            'Add users, assign roles, and control permissions including real/compliant view, adjustments, leave, and visitors.',
          side: 'top',
          when: () => tourElementExists('settings-users'),
        },
        {
          id: 'settings-activity',
          title: 'Activity log',
          description: 'Searchable audit trail of logins, settings changes, exports, and other system events.',
          side: 'top',
        },
      ],
    },
  ],
};
