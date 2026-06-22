import { z } from 'zod';

export const AdminOverviewStatsSchema = z.object({
  asOfDate: z.string(),
  governance: z.object({
    activeUsers: z.number(),
    orgAdmins: z.number(),
    inactiveUsers: z.number(),
    devicesOnline: z.number(),
    devicesOffline: z.number(),
    devicesTotal: z.number(),
    auditEvents7d: z.number(),
    failedLogins7d: z.number(),
    apiOk: z.boolean(),
    dbConnected: z.boolean(),
  }),
  hr: z.object({
    employeesActive: z.number(),
    employeesTotal: z.number(),
    presentToday: z.number(),
    absentToday: z.number(),
    attendanceRate: z.number(),
    pendingAdjustments: z.number(),
  }),
});
export type AdminOverviewStats = z.infer<typeof AdminOverviewStatsSchema>;
