import { EmployeeModel } from '../../models/Employee.js';
import { isMailEnabled } from '../../config/mail.js';
import { logger } from '../../utils/logger.js';

export async function notifyLeaveApplied(params: {
  employeeId: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  status: string;
  totalDays: number;
}): Promise<{ sent: boolean; error?: string }> {
  if (!isMailEnabled()) {
    return { sent: false, error: 'mail_disabled' };
  }

  const employee = await EmployeeModel.findById(params.employeeId).select('name email').lean();
  if (!employee?.email) {
    return { sent: false, error: 'no_employee_email' };
  }

  try {
    // Employee email field may not exist on model — log for demo; extend when email on Employee is added
    logger.info('Leave notification (employee email not on Employee model yet)', {
      employee: employee.name,
      leave: params.leaveTypeName,
      dates: `${params.fromDate} - ${params.toDate}`,
      status: params.status,
    });
    return { sent: false, error: 'employee_email_not_configured' };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : 'send_failed' };
  }
}
