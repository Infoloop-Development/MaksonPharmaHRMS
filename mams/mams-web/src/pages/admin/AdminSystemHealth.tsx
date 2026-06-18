import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { Badge } from '../../components/ui/Badge';

export function AdminSystemHealth() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: adminApi.health,
    refetchInterval: 60_000,
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">System health</h1>
          <p className="text-sm text-text-muted mt-1">API, database, and device fleet summary.</p>
        </div>
        <button type="button" className="btn-outline btn-sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {isLoading && <div className="text-text-muted">Loading…</div>}
      {error && <div className="text-red text-sm">Unable to load health data. Check read.system_health permission.</div>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HealthCard title="API">
            <Row label="Status" value={<Badge tone="green">{data.api}</Badge>} />
            <Row label="Version" value={data.version} />
            <Row label="Timezone" value={data.timezone} />
            <Row label="Checked at" value={new Date(data.ts).toLocaleString()} />
          </HealthCard>
          <HealthCard title="Database">
            <Row label="Connected" value={<Badge tone={data.dbConnected ? 'green' : 'red'}>{data.dbConnected ? 'Yes' : 'No'}</Badge>} />
            <Row label="Ready state" value={String(data.dbState)} />
          </HealthCard>
          <HealthCard title="Device fleet">
            <Row label="Online (15 min)" value={String(data.devices.online)} />
            <Row label="Offline" value={String(data.devices.offline)} />
            <Row label="Total active" value={String(data.devices.total)} />
          </HealthCard>
        </div>
      )}
    </div>
  );
}

function HealthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
