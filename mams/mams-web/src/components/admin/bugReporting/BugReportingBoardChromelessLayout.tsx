import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { canManageBugReports } from '@mams/types';
import { useAuth } from '../../../store/auth';
import { ToastContainer } from '../../ui/Toast';
import { TimeFormatProvider } from '../../../store/timeFormat';
import { settingsApi } from '../../../api/settings';

/** Full-viewport shell for the bug board — no sidebar, top bar, or mobile chrome. */
export function BugReportingBoardChromelessLayout() {
  const user = useAuth((s) => s.user);
  const location = useLocation();

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    staleTime: 60_000,
  });

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (!canManageBugReports(user.permissions ?? [])) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <TimeFormatProvider format={settings?.timeFormat ?? '12h'}>
      <div className="h-screen w-screen overflow-hidden bg-bg flex flex-col">
        <Outlet />
        <ToastContainer />
      </div>
    </TimeFormatProvider>
  );
}
