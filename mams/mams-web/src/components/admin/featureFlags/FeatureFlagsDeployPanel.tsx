import { useState } from 'react';
import { useToast } from '../../ui/Toast';
import { AdminSectionCard } from '../../ui/AdminSectionCard';

export function FeatureFlagsDeployPanel({ deploySnippet }: { deploySnippet: string }) {
  const [open, setOpen] = useState(false);
  const toast = useToast((s) => s.push);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(deploySnippet);
      toast('Deployment snippet copied', 'success');
    } catch {
      toast('Could not copy to clipboard', 'error');
    }
  };

  return (
    <AdminSectionCard
      title="Deployment env snippet"
      headerRight={
        <button
          type="button"
          className="text-xs font-semibold text-primary hover:underline"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? 'Hide' : 'Show'}
        </button>
      }
    >
      <p className="text-xs text-text-muted mb-3 -mt-1">
        Copy for Render (API) and Netlify (web build). MongoDB overrides apply immediately on the API.
      </p>
      {open && (
        <div className="space-y-2">
          <pre className="text-[11px] font-mono bg-surface2 border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
            {deploySnippet}
          </pre>
          <button type="button" className="btn-outline btn-sm" onClick={() => void onCopy()}>
            Copy snippet
          </button>
        </div>
      )}
    </AdminSectionCard>
  );
}
