import type { OnboardingTourId } from '@mams/types';

export type TourMeta = {
  welcomeTitle: string;
  welcomeDescription: string;
};

export const TOUR_META: Record<OnboardingTourId, TourMeta> = {
  dashboard: {
    welcomeTitle: 'Welcome to MAMS Dashboard',
    welcomeDescription:
      'Take a quick guided tour to learn how KPIs, charts, and the attendance table work together.',
  },
  employees: {
    welcomeTitle: 'Welcome to Employees',
    welcomeDescription:
      'Learn how to search the directory, add or import staff, and open employee profiles.',
  },
  attendance: {
    welcomeTitle: 'Welcome to Attendance Log',
    welcomeDescription:
      'See live punches, filter by type and date, and spot clock-ins outside the main shift.',
  },
  reports: {
    welcomeTitle: 'Welcome to Reports',
    welcomeDescription:
      'Generate daily, monthly, department, and location attendance reports and export or print them.',
  },
  adjustments: {
    welcomeTitle: 'Welcome to Adjustments',
    welcomeDescription:
      'Submit attendance corrections and review pending approvals in one place.',
  },
  regularization: {
    welcomeTitle: 'Welcome to Regularization',
    welcomeDescription:
      'Request missed-punch corrections and track approval status.',
  },
  leave: {
    welcomeTitle: 'Welcome to Leave',
    welcomeDescription:
      'Apply for leave, review requests, and manage holidays and leave settings.',
  },
  visitors: {
    welcomeTitle: 'Welcome to Visitors',
    welcomeDescription:
      'Review visitor requests and manage public registration forms with shareable links and QR codes.',
  },
  devices: {
    welcomeTitle: 'Welcome to Devices',
    welcomeDescription:
      'Register and monitor eSSL and Hanvon biometric devices that feed attendance punches.',
  },
  settings: {
    welcomeTitle: 'Welcome to Settings',
    welcomeDescription:
      'Configure company info, shifts, branding, users, and system preferences.',
  },
  'admin-overview': {
    welcomeTitle: 'Welcome to Admin Overview',
    welcomeDescription:
      'Learn how to filter KPIs and charts, customize metrics, chart types, table datasets, and columns for your organization.',
  },
};
