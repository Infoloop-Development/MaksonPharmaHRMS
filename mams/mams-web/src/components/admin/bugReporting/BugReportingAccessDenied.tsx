import { Link } from 'react-router-dom';

export function BugReportingAccessDenied() {
  return (
    <div className="max-w-lg mx-auto mt-12">
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4" aria-hidden>
          🔒
        </div>
        <h1 className="text-xl font-bold mb-2">Access Denied</h1>
        <p className="text-sm text-text-muted mb-6">
          You do not have permission to view bug reports. This area is restricted to IT Admins with
          bug reporting access.
        </p>
        <Link to="/dashboard" className="btn-primary btn-sm">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
