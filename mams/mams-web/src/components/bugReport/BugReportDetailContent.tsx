import type { BugReportDetail } from '@mams/types';
import { BUG_REPORT_SEVERITY_LABELS } from '@mams/types';
import { Badge } from '../ui/Badge';
import { fmtIstDate } from '../../lib/format';
import { BugReportVideoPlayer } from './BugReportVideoPlayer';
import { BugReportTranscriptionSection } from './BugReportTranscriptionSection';
import { BugReportAttachmentsSection } from './BugReportAttachmentsSection';

function severityTone(severity: string): 'green' | 'amber' | 'red' | 'blue' {
  if (severity === 'critical') return 'red';
  if (severity === 'high') return 'amber';
  if (severity === 'medium') return 'blue';
  return 'green';
}

type Props = {
  data: BugReportDetail;
  compact?: boolean;
};

export function BugReportDetailContent({ data, compact = false }: Props) {
  return (
    <div className={compact ? 'space-y-4' : 'space-y-4'}>
      <div className="grid grid-cols-1 gap-4">
        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-sm">Screenshot</h2>
            <Badge tone={severityTone(data.severity)}>{BUG_REPORT_SEVERITY_LABELS[data.severity]}</Badge>
          </div>
          {data.screenshotDataUrl ? (
            <img
              src={data.screenshotDataUrl}
              alt="Bug screenshot"
              className="max-h-[360px] w-full object-contain rounded-md border border-border"
            />
          ) : (
            <p className="text-sm text-text-muted">No screenshot attached.</p>
          )}
          <BugReportAttachmentsSection reportId={data.id} attachments={data.attachments ?? []} />
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold text-sm mb-3">Screen recording</h2>
        {data.hasVideo ? (
          <>
            <BugReportVideoPlayer reportId={data.id} />
            <BugReportTranscriptionSection reportId={data.id} detail={data} />
          </>
        ) : (
          <p className="text-sm text-text-muted">No screen recording attached.</p>
        )}
      </div>

      <div className="card p-4">
        <h2 className="font-semibold text-sm mb-2">Description</h2>
        <p className="text-sm whitespace-pre-wrap">{data.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold text-sm mb-2">Console log</h2>
          <pre className="text-xs font-mono bg-surface2 p-3 rounded-md max-h-48 overflow-auto whitespace-pre-wrap">
            {data.consoleLog.length
              ? data.consoleLog.map((e) => `[${e.level}] ${e.message}`).join('\n')
              : '(empty)'}
          </pre>
        </div>
        <div className="card p-4">
          <h2 className="font-semibold text-sm mb-2">Breadcrumb trail</h2>
          <ol className="text-xs space-y-1 max-h-48 overflow-auto list-decimal list-inside">
            {data.breadcrumbs.map((b, i) => (
              <li key={`${b.ts}-${i}`}>
                <span className="text-text-muted">{fmtIstDate(b.ts)}</span> — {b.action}
              </li>
            ))}
            {data.breadcrumbs.length === 0 && <li className="list-none text-text-muted">(empty)</li>}
          </ol>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold text-sm mb-2">Failed network requests</h2>
          <pre className="text-xs font-mono bg-surface2 p-3 rounded-md max-h-48 overflow-auto whitespace-pre-wrap">
            {data.failedRequests.length
              ? data.failedRequests
                  .map((r) => `${r.method} ${r.path} → ${r.status}${r.body ? `\n  ${r.body}` : ''}`)
                  .join('\n\n')
              : '(none)'}
          </pre>
        </div>
        <div className="card p-4">
          <h2 className="font-semibold text-sm mb-2">Context</h2>
          <dl className="text-xs space-y-1">
            <div>
              <dt className="text-text-muted inline">Browser: </dt>
              <dd className="inline">{data.context.browser}</dd>
            </div>
            <div>
              <dt className="text-text-muted inline">OS: </dt>
              <dd className="inline">{data.context.os}</dd>
            </div>
            <div>
              <dt className="text-text-muted inline">Viewport: </dt>
              <dd className="inline">{data.context.viewport}</dd>
            </div>
            <div>
              <dt className="text-text-muted inline">Session duration: </dt>
              <dd className="inline">{Math.round(data.context.sessionDurationMs / 1000)}s</dd>
            </div>
            <div>
              <dt className="text-text-muted inline">Role: </dt>
              <dd className="inline">{data.context.role}</dd>
            </div>
            <div>
              <dt className="text-text-muted inline">Reporter: </dt>
              <dd className="inline">
                {data.reporter.name} ({data.reporter.email})
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
