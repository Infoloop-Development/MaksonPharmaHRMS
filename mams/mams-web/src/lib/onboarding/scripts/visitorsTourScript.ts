import type { TourScript } from '../tourTypes';

export const visitorsTourScript: TourScript = {
  phases: [
    {
      id: 'overview',
      steps: [
        {
          id: 'visitors-header',
          title: 'Visitor management',
          description:
            'Review visitor requests and manage public registration forms with shareable links and branded QR codes.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'tabs',
      steps: [
        {
          id: 'visitors-tabs',
          title: 'Requests and forms',
          description:
            'Visitor Requests: approve or reject submissions. Forms: build public pages visitors fill before arriving on site.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'content',
      steps: [
        {
          id: 'visitors-content',
          title: 'Active tab',
          description:
            'On Requests: filter by status, search visitors, and open details. On Forms: create forms, copy links, print QR stickers.',
          side: 'top',
        },
      ],
    },
  ],
};
