import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { useToast } from '../../components/ui/Toast';
import { Toggle } from '../../components/ui/Field';

export function AdminFeatureFlags() {
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: adminApi.getFeatureFlags,
  });

  const mutation = useMutation({
    mutationFn: adminApi.patchFeatureFlags,
    onSuccess: (res) => {
      toast('Feature flags updated', 'success');
      qc.setQueryData(['admin', 'feature-flags'], res);
    },
    onError: (e: unknown) => toast(e instanceof Error ? e.message : 'Update failed', 'error'),
  });

  if (isLoading || !data) return <div className="text-text-muted">Loading…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Feature flags</h1>
        <p className="text-sm text-text-muted mt-1">
          Toggle org-wide features. {data.note}
        </p>
      </div>

      <div className="card p-5 space-y-6 max-w-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium">Sensitive field unmask</div>
            <div className="text-xs text-text-muted">FEATURE_UNMASK_ENABLED</div>
          </div>
          <Toggle
            checked={data.unmaskEnabled}
            onChange={(v) => mutation.mutate({ unmaskEnabled: v })}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium">Autogen shift demo</div>
            <div className="text-xs text-text-muted">FEATURE_AUTOGEN_DEMO_ENABLED</div>
          </div>
          <Toggle
            checked={data.autogenDemoEnabled}
            onChange={(v) => mutation.mutate({ autogenDemoEnabled: v })}
          />
        </div>
      </div>
    </div>
  );
}
