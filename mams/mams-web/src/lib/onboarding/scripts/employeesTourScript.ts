import type { TourScript } from '../tourTypes';
import { tourElementExists } from '../tourDom';

export const employeesTourScript: TourScript = {
  onCleanup: async (ctx) => {
    ctx.pageApi.closeModals?.();
    ctx.pageApi.clearSearch?.();
  },
  phases: [
    {
      id: 'overview',
      steps: [
        {
          id: 'employees-header',
          title: 'Employee directory',
          description: 'Browse all staff, see the total count, and open profiles for shift and contact details.',
          side: 'bottom',
        },
        {
          id: 'employees-actions',
          title: 'Add and import',
          description:
            'Add employees individually or bulk-import from CSV. Download the template first to match required columns.',
          side: 'left',
          when: () => tourElementExists('employees-actions'),
        },
        {
          id: 'employees-biometric-banner',
          title: 'Biometric IDs',
          description:
            'Employees missing a biometric ID cannot match device punches. Resolve gaps before go-live.',
          side: 'bottom',
          when: () => tourElementExists('employees-biometric-banner'),
        },
      ],
    },
    {
      id: 'search',
      steps: [
        {
          id: 'employees-search',
          title: 'Search',
          description:
            'Search by name, employee code, or biometric ID. Results update as you type and log to the activity audit.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'list',
      steps: [
        {
          id: 'employees-list',
          title: 'Employee list',
          description:
            'Mobile shows cards; desktop shows a sortable table. Click a name to open the full employee profile.',
          side: 'top',
        },
        {
          id: 'employees-table',
          title: 'Table columns',
          description:
            'Code, biometric ID, department, location, shift, join date, and status. Sensitive fields are masked unless you have unmask permission.',
          side: 'top',
          when: () => tourElementExists('employees-table'),
        },
        {
          id: 'employees-pagination',
          title: 'Pagination',
          description: 'Navigate pages when you have more than 50 employees. Search narrows the total across all pages.',
          side: 'top',
          when: () => tourElementExists('employees-pagination'),
        },
      ],
    },
  ],
};
