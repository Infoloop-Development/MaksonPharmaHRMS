import { Router } from 'express';
import { EmployeeModel } from '../models/Employee.js';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { DeviceModel } from '../models/Device.js';
import { AdjustmentModel } from '../models/Adjustment.js';
import { requireAuth } from '../middleware/auth.js';
import { utcToIstDateString } from '../utils/time.js';

const router = Router();
router.use(requireAuth);

router.get('/stats', async (_req, res, next) => {
  try {
    const today = utcToIstDateString(new Date());
    const [activeEmps, totalEmps, todayPresent, todayAbsent, devices, devicesOnline, pendingAdj] = await Promise.all([
      EmployeeModel.countDocuments({ status: 'Active', isDeleted: { $ne: true } }),
      EmployeeModel.countDocuments({ isDeleted: { $ne: true } }),
      AttendanceDerivedModel.countDocuments({ date: today, status: 'Present' }),
      AttendanceDerivedModel.countDocuments({ date: today, status: 'Absent' }),
      DeviceModel.countDocuments({ isActive: true }),
      DeviceModel.countDocuments({
        isActive: true,
        lastPingAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      }),
      AdjustmentModel.countDocuments({ status: 'Pending' }),
    ]);

    res.json({
      asOfDate: today,
      employees: { active: activeEmps, total: totalEmps },
      attendanceToday: {
        present: todayPresent,
        absent: todayAbsent,
        attendanceRate: activeEmps > 0 ? Math.round((todayPresent / activeEmps) * 100) : 0,
      },
      devices: { total: devices, online: devicesOnline },
      pendingAdjustments: pendingAdj,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/week-trend', async (_req, res, next) => {
  try {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dates.push(utcToIstDateString(d));
    }
    const rows = await AttendanceDerivedModel.aggregate([
      { $match: { date: { $in: dates } } },
      {
        $group: {
          _id: { date: '$date', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]);
    const byDate: Record<string, { present: number; absent: number; weeklyOff: number }> = {};
    for (const d of dates) byDate[d] = { present: 0, absent: 0, weeklyOff: 0 };
    for (const r of rows) {
      const d = r._id.date as string;
      const s = r._id.status as string;
      if (!byDate[d]) continue;
      if (s === 'Present') byDate[d].present = r.count;
      if (s === 'Absent') byDate[d].absent = r.count;
      if (s === 'Weekly Off') byDate[d].weeklyOff = r.count;
    }
    res.json({ dates, series: byDate });
  } catch (err) {
    next(err);
  }
});

export default router;
