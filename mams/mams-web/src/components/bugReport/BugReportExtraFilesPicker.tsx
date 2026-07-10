import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_BUG_REPORT_ATTACHMENTS } from '@mams/types';
import {
  isBugReportImageMime,
  mergeBugReportAttachmentFiles,
} from '../../lib/bugReport/bugReportAttachmentValidation';

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
};

export function BugReportExtraFilesPicker({ files, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: isBugReportImageMime(file.type) ? URL.createObjectURL(file) : null,
      })),
    [files]
  );

  useEffect(
    () => () => {
      for (const p of previews) {
        if (p.url) URL.revokeObjectURL(p.url);
      }
    },
    [previews]
  );

  const addFiles = (incoming: File[]) => {
    const { files: next, error: err } = mergeBugReportAttachmentFiles(files, incoming);
    onChange(next);
    setError(err);
  };

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
        Add more files
      </h3>
      <p className="text-[11px] text-text-muted mb-2">
        Optional screenshots, images, or PDFs · up to {MAX_BUG_REPORT_ATTACHMENTS} files · 10MB each
      </p>

      <div
        className={`rounded-xl border border-dashed p-4 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border bg-surface2/30'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(Array.from(e.dataTransfer.files ?? []));
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.jpg,.jpeg,.png,.webp,.gif,.pdf"
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="btn-outline btn-sm min-h-[40px]"
          onClick={() => inputRef.current?.click()}
        >
          Choose files
        </button>
        <p className="text-[11px] text-text-muted mt-2">or drag and drop here</p>
      </div>

      {error && (
        <p className="text-xs text-red mt-2" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {previews.map(({ file, url }) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2"
            >
              {url ? (
                <img src={url} alt="" className="h-12 w-12 rounded object-cover border border-border" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded border border-border bg-surface2 text-xs font-semibold text-text-muted">
                  PDF
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-[11px] text-text-muted">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                type="button"
                className="btn-outline btn-sm shrink-0"
                onClick={() => onChange(files.filter((f) => f !== file))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
