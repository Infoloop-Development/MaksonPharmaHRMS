import { useState } from 'react';
import { useToast } from '../ui/Toast';

export function CopyableField({ label, value }: { label: string; value: string }) {
  const toast = useToast((s) => s.push);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast(`${label} copied`, 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Copy failed', 'error');
    }
  };

  return (
    <div className="rounded border border-border bg-surface2/30 p-2">
      <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1">{label}</div>
      <div className="flex gap-2 items-start">
        <code className="font-mono text-[11px] break-all flex-1 text-text">{value}</code>
        <button type="button" className="btn-outline text-[10px] py-1 px-2 shrink-0" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
