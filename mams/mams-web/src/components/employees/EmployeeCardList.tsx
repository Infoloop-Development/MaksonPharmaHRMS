import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import type { EmployeeMasked } from '@mams/types';
import { useAuth } from '../../store/auth';

export function EmployeeCardList({
  items,
  isLoading,
  error,
}: {
  items: EmployeeMasked[] | undefined;
  isLoading: boolean;
  error: boolean;
}) {
  const isCompliant = useAuth((s) => s.user?.viewMode === 'compliant');

  if (isLoading) {
    return <div className="card p-6 text-center text-text-muted text-sm md:hidden">Loading...</div>;
  }
  if (error) {
    return <div className="card p-6 text-center text-red text-sm md:hidden">Failed to load.</div>;
  }
  if (!items?.length) {
    return <div className="card p-6 text-center text-text-muted text-sm md:hidden">No employees found.</div>;
  }

  return (
    <div className="space-y-3 md:hidden">
      {items.map((e) => (
        <Link key={e.id} to={`/employees/${e.id}`} className="card p-4 block hover:bg-surface2/50 transition">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="font-semibold text-text">{e.name}</div>
              <div className="font-mono text-xs text-text-muted">{e.empCode}</div>
            </div>
            <Badge tone={e.status === 'Active' ? 'green' : 'red'}>{e.status}</Badge>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div className="col-span-2">
              <dt className="text-text-subtle uppercase tracking-wider">Biometric ID</dt>
              <dd className="font-mono">{e.biometricId}</dd>
            </div>
            <div>
              <dt className="text-text-subtle uppercase tracking-wider">Department</dt>
              <dd>{e.department}</dd>
            </div>
            <div>
              <dt className="text-text-subtle uppercase tracking-wider">Shift</dt>
              <dd>{isCompliant ? e.alternateShift : e.timeShift}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-text-subtle uppercase tracking-wider">Location</dt>
              <dd className="text-text-muted">{e.location}</dd>
            </div>
          </dl>
        </Link>
      ))}
    </div>
  );
}
