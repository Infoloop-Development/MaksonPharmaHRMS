import type { TourScript } from '../tourTypes';
import { tourElementExists } from '../tourDom';

export const devicesTourScript: TourScript = {
  phases: [
    {
      id: 'overview',
      steps: [
        {
          id: 'devices-header',
          title: 'Device management',
          description:
            'Register and monitor eSSL and Hanvon biometric units that push attendance punches into MAMS.',
          side: 'bottom',
        },
        {
          id: 'devices-stats',
          title: 'Fleet overview',
          description: 'Total devices, online/offline counts, and punches received in the last 24 hours.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'register',
      steps: [
        {
          id: 'devices-register',
          title: 'Register a device',
          description:
            'Add a new unit with vendor, location, and department. After registering, configure the push URL or token on the device.',
          side: 'left',
          when: () => tourElementExists('devices-register'),
        },
        {
          id: 'devices-setup-guide',
          title: 'Setup guide',
          description: 'Step-by-step instructions for pointing devices at your MAMS server endpoint.',
          side: 'bottom',
          when: () => tourElementExists('devices-setup-guide'),
        },
      ],
    },
    {
      id: 'filters',
      steps: [
        {
          id: 'devices-filters',
          title: 'Filter devices',
          description:
            'Narrow by vendor, department, location, network status, or connection state. Sync All pulls punches from every online unit.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'list',
      steps: [
        {
          id: 'devices-list',
          title: 'Device list',
          description:
            'Each card shows connection health, last sync, and actions to test connectivity, sync punches, or edit settings.',
          side: 'top',
        },
      ],
    },
  ],
};
