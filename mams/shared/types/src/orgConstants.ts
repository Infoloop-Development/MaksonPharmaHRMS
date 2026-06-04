/**
 * Canonical department list (UI dropdown + seed). HR may still type other values via CSV if needed later.
 * Keep aligned with seed data in mams-server/seed/generators.ts.
 */
export const MAKSON_DEPARTMENTS = [
  'Confectionery',
  'Tablet Manufacturing',
  'Liquid Manufacturing',
  'Packaging',
  'Quality Control',
  'R&D',
  'Maintenance',
  'Warehouse',
  'Admin',
  'HR',
  'Finance',
  'Logistics',
] as const;

export type MaksonDepartment = (typeof MAKSON_DEPARTMENTS)[number];

/** Factory / site locations (aligned with seed + Reports filters). */
export const MAKSON_FACTORY_LOCATIONS = [
  'Surendranagar, GJ',
  'Mandideep, MP',
  'Gummadidala, TG',
  'Morbi, GJ',
  'Aurangabad, MH',
] as const;

export type MaksonFactoryLocation = (typeof MAKSON_FACTORY_LOCATIONS)[number];
