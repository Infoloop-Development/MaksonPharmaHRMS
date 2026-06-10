import { LeaveApplicationModel } from '../../models/LeaveApplication.js';
import { addDaysIso, monthEndIso, monthStartIso, todayIso } from './leaveDate.util.js';

export async function getLeaveSummary() {
  const today = todayIso();
  const weekEnd = addDaysIso(today, 7);
  const monthStart = monthStartIso(today);
  const monthEnd = monthEndIso(today);

  const [leavesToday, pendingCount, upcomingCount, monthAgg, todayLeaves] = await Promise.all([
    LeaveApplicationModel.countDocuments({
      status: 'Approved',
      fromDate: { $lte: today },
      toDate: { $gte: today },
    }),
    LeaveApplicationModel.countDocuments({ status: 'Pending' }),
    LeaveApplicationModel.countDocuments({
      status: 'Approved',
      fromDate: { $gt: today, $lte: weekEnd },
    }),
    LeaveApplicationModel.aggregate([
      {
        $match: {
          status: 'Approved',
          fromDate: { $lte: monthEnd },
          toDate: { $gte: monthStart },
        },
      },
      { $group: { _id: null, totalDays: { $sum: '$totalDays' } } },
    ]),
    LeaveApplicationModel.find({
      status: 'Approved',
      fromDate: { $lte: today },
      toDate: { $gte: today },
    })
      .populate('employeeId', 'name empCode')
      .limit(50)
      .lean(),
  ]);

  const leavesThisMonth = monthAgg[0]?.totalDays ?? 0;
  const leavesTodayNames = todayLeaves
    .map((l) => {
      const emp = l.employeeId as { name?: string; empCode?: string } | null;
      return emp?.name ? `${emp.name}${emp.empCode ? ` (${emp.empCode})` : ''}` : null;
    })
    .filter(Boolean) as string[];

  return {
    leavesToday,
    leavesTodayNames,
    pendingApprovals: pendingCount,
    upcomingLeaves7Days: upcomingCount,
    leavesThisMonth,
  };
}
