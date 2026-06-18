import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { VisitorField, VisitorFormLocale } from '@mams/types';
import { getIntroVideoForLocale, validateVisitorResponses, VISITOR_FORM_LOCALE_LABELS } from '@mams/types';
import { publicVisitorApi, PublicVisitorError } from '../api/publicVisitor';
import { VisitorFormLayoutPublic } from '../components/visitors/VisitorFormLayoutRenderer';
import { VisitorFormPublicHeader } from '../components/visitors/VisitorFormPublicHeader';

type Responses = Record<string, string | string[] | null>;
type FileRef = { fieldId: string; storageKey: string; filename: string };

export function PublicVisitorForm() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [responses, setResponses] = useState<Responses>({});
  const [fileRefs, setFileRefs] = useState<FileRef[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [introBlockMessage, setIntroBlockMessage] = useState<string | null>(null);
  const [locale, setLocale] = useState<VisitorFormLocale>('en');

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['public-visitor-form', slug],
    queryFn: () => publicVisitorApi.getForm(slug),
    enabled: Boolean(slug),
    retry: false,
  });

  const submitMu = useMutation({
    mutationFn: () =>
      publicVisitorApi.submit(slug, {
        responses,
        fileRefs: fileRefs.map(({ fieldId, storageKey }) => ({ fieldId, storageKey })),
        introAttestation: videoCompleted
          ? { videoCompleted: true, completedAt: new Date().toISOString() }
          : undefined,
        locale,
      }),
    onSuccess: () => setSubmitted(true),
    onError: (e: PublicVisitorError) => {
      if (e.code === 'intro_video_required') {
        setIntroBlockMessage(e.message);
        return;
      }
      if (e.code === 'validation_error' && e.details && typeof e.details === 'object') {
        setFieldErrors(e.details as Record<string, string>);
      }
    },
  });

  const setValue = (fieldId: string, value: string | string[] | null) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const onFileChange = async (field: VisitorField, file: File | null) => {
    if (!file) return;
    setUploadingField(field.id);
    try {
      const result = await publicVisitorApi.uploadFile(slug, field.id, file);
      setFileRefs((prev) => [
        ...prev.filter((r) => r.fieldId !== field.id),
        { fieldId: field.id, storageKey: result.storageKey, filename: result.filename },
      ]);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field.id];
        return next;
      });
    } catch (e) {
      const msg = e instanceof PublicVisitorError ? e.message : 'Upload failed';
      setFieldErrors((prev) => ({ ...prev, [field.id]: msg }));
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    const introFull = form.introFull ?? form.intro;
    const active = form.localeContent?.[locale];
    const fields = active?.fields ?? form.fields;
    const mandatory = getIntroVideoForLocale(introFull, locale)?.viewingMandatory ?? false;
    if (mandatory && !videoCompleted) {
      setIntroBlockMessage('Please watch the full intro video before submitting.');
      return;
    }
    setIntroBlockMessage(null);

    const fileFieldIds = new Set(fileRefs.map((r) => r.fieldId));
    const validation = validateVisitorResponses(fields, responses, fileFieldIds);
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});
    submitMu.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <p className="text-text-muted">Loading form…</p>
      </div>
    );
  }

  if (error) {
    const err = error as PublicVisitorError;
    const message =
      err.status === 410
        ? 'This visitor form link is no longer active. Please use the latest QR code or link provided by the organization.'
        : err.status === 403
          ? 'This visitor form is not currently accepting submissions.'
          : err.status === 404
            ? 'Visitor form not found. Please check the link and try again.'
            : err.message || 'Unable to load this form.';
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="card max-w-md w-full p-8 text-center">
          <h1 className="text-lg font-semibold mb-2">Unable to open form</h1>
          <p className="text-sm text-text-muted">{message}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="card max-w-md w-full p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green/10 text-green flex items-center justify-center mx-auto mb-4 text-xl">
            ✓
          </div>
          <h1 className="text-lg font-semibold mb-2">Request submitted</h1>
          <p className="text-sm text-text-muted">
            Your visitor request has been submitted successfully and is awaiting review.
          </p>
        </div>
      </div>
    );
  }

  if (!form) return null;

  const introFull = form.introFull ?? form.intro;
  const activeContent = form.localeContent?.[locale] ?? {
    title: form.title,
    description: form.description,
    fields: form.fields,
    intro: form.intro,
  };

  const switchLocale = (next: VisitorFormLocale) => {
    setLocale(next);
    setVideoCompleted(false);
    setIntroBlockMessage(null);
  };

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-lg mx-auto card p-6 md:p-8">
        {form.branding && <VisitorFormPublicHeader branding={form.branding} />}

        <h1 className="text-xl font-bold mb-1">{activeContent.title}</h1>
        {activeContent.description && (
          <p className="text-sm text-text-muted mb-4">{activeContent.description}</p>
        )}

        {form.multilingual?.enabled && form.multilingual.languages.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {form.multilingual.languages.map((lang) => (
              <button
                key={lang}
                type="button"
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  locale === lang
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface2 border-border text-text-muted hover:border-primary/40'
                }`}
                onClick={() => switchLocale(lang)}
              >
                {VISITOR_FORM_LOCALE_LABELS[lang]}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <VisitorFormLayoutPublic
            intro={introFull}
            fields={activeContent.fields}
            slug={slug}
            locale={locale}
            videoCompleted={videoCompleted}
            onVideoCompleted={() => {
              setVideoCompleted(true);
              setIntroBlockMessage(null);
            }}
            renderField={(field) => (
              <PublicFieldInput
                field={field}
                value={responses[field.id]}
                fileRef={fileRefs.find((r) => r.fieldId === field.id)}
                error={fieldErrors[field.id]}
                uploading={uploadingField === field.id}
                onChange={(v) => setValue(field.id, v)}
                onFile={(f) => onFileChange(field, f)}
              />
            )}
          />

          {introBlockMessage && (
            <p className="text-sm text-red bg-red/10 border border-red/20 rounded-md px-3 py-2">
              {introBlockMessage}
            </p>
          )}

          {submitMu.error && !(submitMu.error as PublicVisitorError).details && (
            <p className="text-sm text-red">{(submitMu.error as Error).message}</p>
          )}

          <button
            type="submit"
            className="btn bg-primary text-white w-full py-2.5 rounded-md font-semibold"
            disabled={submitMu.isPending}
          >
            {submitMu.isPending ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </div>
    </div>
  );
}

function PublicFieldInput({
  field,
  value,
  fileRef,
  error,
  uploading,
  onChange,
  onFile,
}: {
  field: VisitorField;
  value: string | string[] | null | undefined;
  fileRef?: FileRef;
  error?: string;
  uploading: boolean;
  onChange: (v: string | string[] | null) => void;
  onFile: (f: File | null) => void;
}) {
  const label = (
    <label className="block text-sm font-medium mb-1">
      {field.label}
      {field.required && <span className="text-red ml-0.5">*</span>}
    </label>
  );
  const help = field.helpText ? <p className="text-xs text-text-muted mb-1">{field.helpText}</p> : null;
  const errEl = error ? <p className="text-xs text-red mt-1">{error}</p> : null;

  switch (field.type) {
    case 'short_text':
    case 'email':
    case 'phone':
      return (
        <div>
          {label}
          {help}
          <input
            className={`input w-full ${error ? 'border-red' : ''}`}
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {errEl}
        </div>
      );
    case 'long_text':
      return (
        <div>
          {label}
          {help}
          <textarea
            className={`input w-full min-h-[88px] ${error ? 'border-red' : ''}`}
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {errEl}
        </div>
      );
    case 'date':
      return (
        <div>
          {label}
          {help}
          <input
            type="date"
            className={`input w-full ${error ? 'border-red' : ''}`}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {errEl}
        </div>
      );
    case 'time':
      return (
        <div>
          {label}
          {help}
          <input
            type="time"
            className={`input w-full ${error ? 'border-red' : ''}`}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {errEl}
        </div>
      );
    case 'dropdown':
      return (
        <div>
          {label}
          {help}
          <select
            className={`input w-full ${error ? 'border-red' : ''}`}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
          >
            <option value="">{field.placeholder ?? 'Select…'}</option>
            {(field.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {errEl}
        </div>
      );
    case 'radio':
      return (
        <div>
          {label}
          {help}
          <div className="space-y-1">
            {(field.options ?? []).map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={field.id}
                  checked={(value as string) === o}
                  onChange={() => onChange(o)}
                />
                {o}
              </label>
            ))}
          </div>
          {errEl}
        </div>
      );
    case 'checkbox': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div>
          {label}
          {help}
          <div className="space-y-1">
            {(field.options ?? []).map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(o)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, o]
                      : selected.filter((x) => x !== o);
                    onChange(next.length ? next : null);
                  }}
                />
                {o}
              </label>
            ))}
          </div>
          {errEl}
        </div>
      );
    }
    case 'file':
      return (
        <div>
          {label}
          {help}
          <input
            type="file"
            className={`input w-full ${error ? 'border-red' : ''}`}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            disabled={uploading}
          />
          {uploading && <p className="text-xs text-text-muted mt-1">Uploading…</p>}
          {fileRef && !uploading && (
            <p className="text-xs text-green mt-1">Uploaded: {fileRef.filename}</p>
          )}
          {errEl}
        </div>
      );
    default:
      return null;
  }
}
