import { z } from 'zod';

export const ShiftWindowSchema = z.object({
  id: z.string(),
  start: z.string(), // 'HH:MM'
  end: z.string(),
  label: z.string(),
});
export type ShiftWindow = z.infer<typeof ShiftWindowSchema>;

export const SettingsPublicSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  cin: z.string(),
  gstin: z.string(),
  pfRegistrationNumber: z.string(),
  esiRegistrationNumber: z.string(),
  factoryLicenceNumber: z.string(),
  registeredAddress: z.string(),
  signatoryName: z.string(),
  signatoryDesignation: z.string(),
  weeklyOffDefault: z.array(z.string()),
  realShifts: z.array(ShiftWindowSchema),
  complianceShifts: z.array(ShiftWindowSchema),
  smartAnchorEnabled: z.boolean(),
  smartAnchorVersion: z.string(),
  confidentialityNoticeEnabled: z.boolean(),
  confidentialityNoticeText: z.string(),
});
export type SettingsPublic = z.infer<typeof SettingsPublicSchema>;
