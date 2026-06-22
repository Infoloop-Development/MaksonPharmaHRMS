import { Link } from 'react-router-dom';

type EmployeeRow = {
  id: string;
  empCode: string;
  name: string;
  biometricId: string;
  location: string;
};

export function ReadinessEmployeeCardList({ items }: { items: EmployeeRow[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2 md:hidden max-h-48 overflow-y-auto">
      {items.map((e) => (
        <div key={e.id} className="border border-border rounded p-3 text-xs bg-surface">
          <div className="flex items-start justify-between gap-2 mb-2">
            <Link to={`/employees/${e.id}`} className="font-semibold text-primary hover:underline">
              {e.name}
            </Link>
            <span className="font-mono text-text-muted shrink-0">{e.empCode}</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div>
              <dt className="text-text-subtle uppercase tracking-wider">Biometric ID</dt>
              <dd className="font-mono">{e.biometricId}</dd>
            </div>
            <div>
              <dt className="text-text-subtle uppercase tracking-wider">Location</dt>
              <dd className="text-text-muted">{e.location}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}
