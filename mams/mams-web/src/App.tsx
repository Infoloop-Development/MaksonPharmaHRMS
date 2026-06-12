import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './store/auth';
import { Layout } from './components/Layout';
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
import { isAutogenDemoEnabled } from './config/featureFlags';
import { AutogenerationDemo } from './pages/AutogenerationDemo';

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
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        <Route path="attendance" element={<AttendanceLog />} />
        <Route path="reports" element={<Reports />} />
        {isAutogenDemoEnabled() && (
          <Route path="autogeneration-demo" element={<AutogenerationDemo />} />
        )}
        <Route path="adjustments" element={<Adjustments />} />
        <Route path="regularization" element={<Regularization />} />
        <Route path="leave" element={<Leave />} />
        <Route path="visitors" element={<Visitors />} />
        <Route path="devices" element={<Devices />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
