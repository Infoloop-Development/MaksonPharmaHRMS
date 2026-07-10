import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BugReportComment } from '@mams/types';
import { adminBugReportingApi, BUG_REPORTING_QUERY_KEY } from '../../api/adminBugReporting';
import { apiBasePath } from '../../api/apiBase';
import { useAuth } from '../../store/auth';
import { useToast } from '../ui/Toast';
import { MentionTextarea } from './MentionTextarea';

type MentionUser = { id: string; name: string };

const IST = 'Asia/Kolkata';

function fmtCommentTime(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
      <path d="M3.4 20.6 22 12 3.4 3.4l2.8 7.2L17 12l-10.8 1.4-2.8 7.2z" />
    </svg>
  );
}

function CommentImage({
  reportId,
  commentId,
  attachment,
}: {
  reportId: string;
  commentId: string;
  attachment: BugReportComment['attachments'][number];
}) {
  const accessToken = useAuth((s) => s.accessToken);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let revoked: string | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `${apiBasePath()}/admin/bug-reporting/${encodeURIComponent(reportId)}/comments/${encodeURIComponent(commentId)}/attachments/${encodeURIComponent(attachment.id)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) throw new Error('load failed');
        const blob = await res.blob();
        if (cancelled) return;
        revoked = URL.createObjectURL(blob);
        setSrc(revoked);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [accessToken, reportId, commentId, attachment.id]);

  if (!src) return <p className="text-xs text-text-muted mt-2">Loading image…</p>;
  return (
    <img
      src={src}
      alt={attachment.originalName}
      className="mt-2 max-h-44 rounded-md border border-border object-contain bg-surface"
    />
  );
}

function CommentItem({
  comment,
  reportId,
  replies,
  onReply,
}: {
  comment: BugReportComment;
  reportId: string;
  replies: BugReportComment[];
  onReply: (parentId: string) => void;
}) {
  const initials = comment.author.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex gap-2.5">
      <div className="w-8 h-8 rounded-full bg-primary-bg text-primary-on-bg text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="rounded-xl rounded-tl-sm border border-border bg-surface px-3 py-2.5 shadow-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-text">{comment.author.name}</span>
            <span className="text-[10px] text-text-muted shrink-0">{fmtCommentTime(comment.createdAt)}</span>
          </div>
          <p className="mt-1 text-sm whitespace-pre-wrap break-words text-text">{comment.body}</p>
          {comment.attachments.map((a) => (
            <CommentImage key={a.id} reportId={reportId} commentId={comment.id} attachment={a} />
          ))}
        </div>
        {!comment.parentId && (
          <button
            type="button"
            className="mt-1 ml-1 text-xs text-link hover:underline"
            onClick={() => onReply(comment.id)}
          >
            Reply
          </button>
        )}
        {replies.length > 0 && (
          <div className="mt-2 space-y-2 pl-3 border-l-2 border-border/80">
            {replies.map((r) => (
              <CommentItem key={r.id} comment={r} reportId={reportId} replies={[]} onReply={onReply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type Props = {
  reportId: string;
  mentionUsers: MentionUser[];
};

export function BugReportCommentThread({ reportId, mentionUsers }: Props) {
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([]);
  const [parentId, setParentId] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [...BUG_REPORTING_QUERY_KEY, reportId, 'comments'],
    queryFn: () => adminBugReportingApi.comments.list(reportId),
    enabled: Boolean(reportId),
  });

  const createMu = useMutation({
    mutationFn: () =>
      adminBugReportingApi.comments.create(
        reportId,
        { body, parentId: parentId ?? undefined, mentionUserIds },
        image ?? undefined
      ),
    onSuccess: () => {
      setBody('');
      setMentionUserIds([]);
      setParentId(null);
      setImage(null);
      void qc.invalidateQueries({ queryKey: [...BUG_REPORTING_QUERY_KEY, reportId, 'comments'] });
    },
    onError: (e: unknown) => toast(e instanceof Error ? e.message : 'Failed to post comment', 'error'),
  });

  const submit = () => {
    if (!body.trim() || createMu.isPending) return;
    createMu.mutate();
  };

  const comments = data?.comments ?? [];
  const roots = comments.filter((c) => !c.parentId);
  const repliesByParent = comments.reduce<Record<string, BugReportComment[]>>((acc, c) => {
    if (!c.parentId) return acc;
    (acc[c.parentId] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <h2 className="font-semibold text-sm mb-3 shrink-0 text-text">Comments</h2>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {isLoading && <p className="text-sm text-text-muted">Loading comments…</p>}
        {!isLoading && roots.length === 0 && (
          <p className="text-sm text-text-muted py-6 text-center">No comments yet — start the conversation below.</p>
        )}
        {roots.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            reportId={reportId}
            replies={repliesByParent[c.id] ?? []}
            onReply={setParentId}
          />
        ))}
      </div>

      <div className="shrink-0 pt-3 mt-2 border-t border-border">
        {parentId && (
          <div className="mb-2 flex items-center justify-between rounded-md bg-surface2/60 px-2.5 py-1.5 text-xs text-text-muted">
            <span>Replying to thread</span>
            <button type="button" className="text-link hover:underline" onClick={() => setParentId(null)}>
              Cancel
            </button>
          </div>
        )}

        {image && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-surface2/50 px-2.5 py-1.5 text-xs">
            <PaperclipIcon />
            <span className="truncate flex-1 text-text-muted">{image.name}</span>
            <button type="button" className="text-text-muted hover:text-red" onClick={() => setImage(null)} aria-label="Remove attachment">
              ✕
            </button>
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 transition">
          <MentionTextarea
            embedded
            value={body}
            users={mentionUsers}
            disabled={createMu.isPending}
            onSubmit={submit}
            placeholder="Write a comment… Use @ to mention IT Admins"
            onChange={(v, ids) => {
              setBody(v);
              setMentionUserIds(ids);
            }}
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface2 hover:text-text transition-colors"
              title="Attach image"
              aria-label="Attach image"
              disabled={createMu.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <PaperclipIcon />
            </button>
            <button
              type="button"
              className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
              disabled={!body.trim() || createMu.isPending}
              onClick={submit}
            >
              <SendIcon />
              {createMu.isPending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
