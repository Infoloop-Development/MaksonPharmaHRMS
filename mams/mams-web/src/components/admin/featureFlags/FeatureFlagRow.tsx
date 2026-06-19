import type { FeatureFlagState } from '@mams/types';
import { Badge } from '../../ui/Badge';
import { Toggle } from '../../ui/Field';
import { sourceLabel } from '../../../lib/featureFlagCatalog';

export function FeatureFlagRow({
  flag,
  busy,
  onToggle,
}: {
  flag: FeatureFlagState;
  busy: boolean;
  onToggle: (next: boolean) => void;
}) {
  const envKeys = [flag.serverEnvKey, flag.webEnvKey].filter(Boolean);
  const showWarning = flag.webSynced === false;

  return (
    <div className="py-4 border-b border-border last:border-0 last:pb-0 first:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="font-medium">{flag.label}</div>
            <Badge tone={flag.enabled ? 'green' : 'gray'}>{flag.enabled ? 'Enabled' : 'Disabled'}</Badge>
          </div>
          <div className="text-xs text-text-muted">{flag.description}</div>
          {envKeys.length > 0 && (
            <div className="text-[11px] font-mono text-text-subtle mt-1.5">{envKeys.join(' · ')}</div>
          )}
          <div className="text-[11px] text-text-subtle mt-1">
            Source: {sourceLabel(flag.effectiveSource)}
            {flag.requiresWebRebuild ? ' · Web rebuild may be required' : ''}
          </div>
        </div>
        <Toggle
          checked={flag.enabled}
          disabled={busy}
          onChange={onToggle}
          ariaLabel={`Toggle ${flag.label}`}
        />
      </div>
      {showWarning && (
        <div className="dash-layout-blocked-msg mt-3 mb-0">
          Web build may not match server until Netlify env is updated and the site is redeployed.
        </div>
      )}
    </div>
  );
}
