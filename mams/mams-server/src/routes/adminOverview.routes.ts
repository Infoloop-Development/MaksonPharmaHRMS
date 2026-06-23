import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  AdminOverviewAnalyticsQuerySchema,
  AdminOverviewChartsQuerySchema,
  AdminOverviewKpiConfigSchema,
  AdminOverviewTableConfigSchema,
  AdminOverviewWidgetsConfigSchema,
  DashboardAttendanceQuerySchema,
  OrgActivityListQuerySchema,
} from '@mams/types';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';
import {
  adminOverviewKpiAuditPayload,
  adminOverviewKpiChanged,
  adminOverviewTableAuditPayload,
  adminOverviewTableChanged,
  adminOverviewWidgetsAuditPayload,
  adminOverviewWidgetsChanged,
} from '../services/adminOverviewActivity.service.js';
import {
  auditPageBadge,
  getAdminOverviewAnalytics,
  getAdminOverviewCharts,
  getAdminOverviewStats,
  listAdminOverviewDevices,
  listAdminOverviewEmployees,
  listAdminOverviewUsers,
} from '../services/adminOverview.service.js';
import { getAdminOverviewKpi, saveAdminOverviewKpi } from '../services/adminOverviewKpi.service.js';
import {
  getAdminOverviewTableConfig,
  saveAdminOverviewTableConfig,
} from '../services/adminOverviewTable.service.js';
import { getAdminOverviewWidgets, saveAdminOverviewWidgets } from '../services/adminOverviewWidget.service.js';
import { listDashboardAttendance } from '../services/dashboardAttendance.service.js';
import { listOrgActivity } from '../services/activity.service.js';
import { exportAdminOverviewTableXlsx } from '../services/adminOverviewExport.service.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('read.system_health'));

const TableListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const UsersListQuerySchema = TableListQuerySchema.extend({
  role: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
});

const DevicesListQuerySchema = TableListQuerySchema.extend({
  location: z.string().optional(),
  online: z.enum(['true', 'false']).optional(),
});

const EmployeesListQuerySchema = TableListQuerySchema.extend({
  status: z.string().optional(),
  department: z.string().optional(),
});

const ExportQuerySchema = z.object({
  columns: z.string().optional(),
  search: z.string().optional(),
  date: z.string().optional(),
  department: z.string().optional(),
  timeShift: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional(),
  active: z.string().optional(),
  online: z.string().optional(),
  location: z.string().optional(),
  eventType: z.string().optional(),
  category: z.string().optional(),
  userId: z.string().optional(),
});

function sendTableXlsx(
  kind: 'attendance' | 'users' | 'audit' | 'devices' | 'employees',
  req: Request,
  res: Response,
  next: NextFunction
) {
  void (async () => {
    try {
      const q = ExportQuerySchema.parse(req.query);
      const { buffer, filename } = await exportAdminOverviewTableXlsx(
        kind,
        q as Record<string, string | undefined>,
        req.auth!.viewMode
      );
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  })();
}

router.get('/stats', async (_req, res, next) => {
  try {
    res.json(await getAdminOverviewStats());
  } catch (err) {
    next(err);
  }
});

router.get('/analytics', async (req, res, next) => {
  try {
    const q = AdminOverviewAnalyticsQuerySchema.parse(req.query);
    res.json(await getAdminOverviewAnalytics(q.date));
  } catch (err) {
    next(err);
  }
});

router.get('/charts', async (req, res, next) => {
  try {
    const q = AdminOverviewChartsQuerySchema.parse(req.query);
    res.json(await getAdminOverviewCharts(q));
  } catch (err) {
    next(err);
  }
});

router.get('/widgets', async (req, res, next) => {
  try {
    res.json(await getAdminOverviewWidgets(req.auth!.sub));
  } catch (err) {
    next(err);
  }
});

router.put('/widgets', async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const before = await getAdminOverviewWidgets(userId);
    const config = AdminOverviewWidgetsConfigSchema.parse(req.body);
    const saved = await saveAdminOverviewWidgets(userId, config);
    if (adminOverviewWidgetsChanged(before, saved)) {
      await audit(
        'admin_overview_widgets_saved',
        {
          userId,
          ipAddress: req.clientIp ?? null,
          userAgent: req.header('user-agent') ?? null,
        },
        {
          entityType: 'user',
          entityId: userId,
          payload: adminOverviewWidgetsAuditPayload(before, saved),
        }
      );
    }
    res.json(saved);
  } catch (err) {
    next(err);
  }
});

router.get('/kpi', async (req, res, next) => {
  try {
    res.json(await getAdminOverviewKpi(req.auth!.sub));
  } catch (err) {
    next(err);
  }
});

router.put('/kpi', async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const before = await getAdminOverviewKpi(userId);
    const config = AdminOverviewKpiConfigSchema.parse(req.body);
    const saved = await saveAdminOverviewKpi(userId, config);
    if (adminOverviewKpiChanged(before, saved)) {
      await audit(
        'admin_overview_kpi_saved',
        {
          userId,
          ipAddress: req.clientIp ?? null,
          userAgent: req.header('user-agent') ?? null,
        },
        {
          entityType: 'user',
          entityId: userId,
          payload: adminOverviewKpiAuditPayload(before, saved),
        }
      );
    }
    res.json(saved);
  } catch (err) {
    next(err);
  }
});

router.get('/table-config', async (req, res, next) => {
  try {
    res.json(await getAdminOverviewTableConfig(req.auth!.sub));
  } catch (err) {
    next(err);
  }
});

router.put('/table-config', async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const before = await getAdminOverviewTableConfig(userId);
    const config = AdminOverviewTableConfigSchema.parse(req.body);
    const saved = await saveAdminOverviewTableConfig(userId, config);
    if (adminOverviewTableChanged(before, saved)) {
      await audit(
        'admin_overview_table_saved',
        {
          userId,
          ipAddress: req.clientIp ?? null,
          userAgent: req.header('user-agent') ?? null,
        },
        {
          entityType: 'user',
          entityId: userId,
          payload: adminOverviewTableAuditPayload(before, saved),
        }
      );
    }
    res.json(saved);
  } catch (err) {
    next(err);
  }
});

router.get(
  '/attendance',
  requireAnyPermission('read.real', 'read.compliant'),
  async (req, res, next) => {
    try {
      const q = DashboardAttendanceQuerySchema.parse(req.query);
      res.json(await listDashboardAttendance(q, req.auth!.viewMode));
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/users',
  requirePermission('manage.org_users'),
  async (req, res, next) => {
    try {
      const q = UsersListQuerySchema.parse(req.query);
      res.json(
        await listAdminOverviewUsers({
          page: q.page,
          pageSize: q.pageSize,
          search: q.search,
          role: q.role,
          active: q.active === 'true' ? true : q.active === 'false' ? false : undefined,
        })
      );
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/audit',
  requirePermission('read.org_audit'),
  async (req, res, next) => {
    try {
      const q = OrgActivityListQuerySchema.parse(req.query);
      const result = await listOrgActivity(q);
      const items = result.items.map((row) => ({
        ...row,
        pageBadge: auditPageBadge(row.eventType),
      }));
      res.json({ ...result, items });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/devices', async (req, res, next) => {
  try {
    const q = DevicesListQuerySchema.parse(req.query);
    res.json(
      await listAdminOverviewDevices({
        page: q.page,
        pageSize: q.pageSize,
        search: q.search,
        location: q.location,
        online: q.online === 'true' ? true : q.online === 'false' ? false : undefined,
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get(
  '/employees',
  requireAnyPermission('read.real', 'read.compliant', 'manage.employees'),
  async (req, res, next) => {
    try {
      const q = EmployeesListQuerySchema.parse(req.query);
      res.json(await listAdminOverviewEmployees(q));
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/attendance.xlsx',
  requireAnyPermission('read.real', 'read.compliant'),
  (req, res, next) => sendTableXlsx('attendance', req, res, next)
);

router.get(
  '/users.xlsx',
  requirePermission('manage.org_users'),
  (req, res, next) => sendTableXlsx('users', req, res, next)
);

router.get(
  '/audit.xlsx',
  requirePermission('read.org_audit'),
  (req, res, next) => sendTableXlsx('audit', req, res, next)
);

router.get('/devices.xlsx', (req, res, next) => sendTableXlsx('devices', req, res, next));

router.get(
  '/employees.xlsx',
  requireAnyPermission('read.real', 'read.compliant', 'manage.employees'),
  (req, res, next) => sendTableXlsx('employees', req, res, next)
);

export default router;
