import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminBugReportingApi, BUG_REPORTING_QUERY_KEY } from '../../api/adminBugReporting';

/** Redirect legacy full-page bug detail URLs to the board + modal deep link. */
export function AdminBugReportLegacyRedirect() {
  const { id = '' } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: [...BUG_REPORTING_QUERY_KEY, 'legacy-redirect', id],
    queryFn: () => adminBugReportingApi.getOne(id),
    enabled: Boolean(id),
    retry: false,
  });

  if (!id) return <Navigate to="/admin/bug-reporting" replace />;
  if (isLoading) {
    return <p className="text-sm text-text-muted p-4">Loading bug report…</p>;
  }
  if (isError || !data?.publicId) {
    return <Navigate to="/admin/bug-reporting" replace />;
  }
  return <Navigate to={`/admin/bug-reporting/${data.publicId}`} replace />;
}
