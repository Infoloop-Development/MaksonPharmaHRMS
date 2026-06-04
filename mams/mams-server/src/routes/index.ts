import { Router } from 'express';
import authRoutes from './auth.routes.js';
import employeesRoutes from './employees.routes.js';
import attendanceRoutes from './attendance.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import adjustmentsRoutes from './adjustments.routes.js';
import devicesRoutes from './devices.routes.js';
import settingsRoutes from './settings.routes.js';
import reportsRoutes from './reports.routes.js';
import usersRoutes from './users.routes.js';
import csvImportRoutes from './csvImport.routes.js';
import goLiveRoutes from './goLive.routes.js';

export const apiRouter = Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/employees', employeesRoutes);
apiRouter.use('/employees/import-csv', csvImportRoutes);
apiRouter.use('/attendance', attendanceRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/adjustments', adjustmentsRoutes);
apiRouter.use('/devices', devicesRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/reports', reportsRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/go-live', goLiveRoutes);

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});
