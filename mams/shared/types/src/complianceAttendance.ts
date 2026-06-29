import { z } from 'zod';
import { ComplianceShiftSchema } from './employee.js';

export const ComplianceAttendanceUpdateSchema = z.object({
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().optional(),
  hoursWorked: z.coerce.number().min(0).optional(),
  alternateShift: ComplianceShiftSchema.optional(),
  adjustmentNote: z.string().min(5).max(2000),
});

export type ComplianceAttendanceUpdate = z.infer<typeof ComplianceAttendanceUpdateSchema>;
