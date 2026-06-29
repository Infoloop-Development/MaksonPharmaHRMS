import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './store/auth';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/admin/AdminLayout';
import { Login } from './pages/Login';
import { ChangePassword } from './pages/ChangePassword';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { EmployeeDetail } from './pages/EmployeeDetail';
import { AttendanceLog } from './pages/AttendanceLog';
import { Reports } from './pages/Reports';
import { Adjustments } from './pages/Adjustments';
import { Regularization } from './pages/Regularization';
import { Leave } from './pages/Leave';
import { Visitors } from './pages/Visitors';
import { PublicVisitorForm } from './pages/PublicVisitorForm';
import { Devices } from './pages/Devices';
import { Settings } from './pages/Settings';
import { ComplianceSettings } from './pages/ComplianceSettings';
import { ComplianceActivity } from './pages/ComplianceActivity';
import { EmployeeChangeRequests } from './pages/EmployeeChangeRequests';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminOrganization } from './pages/admin/AdminOrganization';
import { AdminSecurity } from './pages/admin/AdminSecurity';
import { AdminAudit } from './pages/admin/AdminAudit';
import { AdminSystemHealth } from './pages/admin/AdminSystemHealth';
import { AdminFeatureFlags } from './pages/admin/AdminFeatureFlags';
import { isAutogenDemoEnabled } from './config/featureFlags';
import { AutogenerationDemo } from './pages/AutogenerationDemo';
import { ComplianceAttendanceLog } from './pages/ComplianceAttendanceLog';
import { defaultHomePath, type Permission } from '@mams/types';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <>{children}</>;
}

function RequireAuthSession({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequirePermission({ permission, fallback, children }: { permission: Permission; fallback: string; children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!user.permissions.includes(permission)) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}

function SettingsGate(){
  const viewMode = useAuth((s) => s.user?.viewMode);
  return viewMode === 'compliant' ? <ComplianceSettings /> : <Settings />;
}

function HomeRedirect() {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={defaultHomePath(user.role)} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/visit/:slug" element={<PublicVisitorForm />} />
      <Route
        path="/change-password"
        element={
          <RequireAuthSession>
            <ChangePassword />
          </RequireAuthSession>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="organization" element={<AdminOrganization />} />
        <Route path="security" element={<AdminSecurity />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="health" element={<AdminSystemHealth />} />
        <Route path="feature-flags" element={<AdminFeatureFlags />} />
      </Route>
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        <Route path="attendance" element={<AttendanceLog />} />
        <Route path="compliance-attendance" element={<ComplianceAttendanceLog />} />
        <Route path="reports" element={<Reports />} />
        {isAutogenDemoEnabled() && (
          <Route path="autogeneration-demo" element={<AutogenerationDemo />} />
        )}
        <Route path="adjustments" element={<Adjustments />} />
        <Route path="regularization" element={<Regularization />} />
        <Route path="leave" element={<Leave />} />
        <Route path="visitors" element={<Visitors />} />
        <Route path="devices" element={<Devices />} />
        <Route path="compliance-activity" element={<ComplianceActivity/>} />
        <Route
          path="employee-change-requests"
          element={
            <RequirePermission permission="approve.employee_change" fallback="/employees">
              <EmployeeChangeRequests />
            </RequirePermission>
          }
        />
        <Route path="settings" element={<SettingsGate />} />
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
