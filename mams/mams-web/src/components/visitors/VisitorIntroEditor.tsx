import { useRef, useState } from 'react';
import {
  normalizeLoomUrl,
  normalizeYoutubeUrl,
  normalizeVisitorLanguages,
  VISITOR_FORM_LOCALE_LABELS,
  type VisitorFormLocale,
  type VisitorIntro,
  type VisitorIntroVideo,
  type VisitorMultilingual,
} from '@mams/types';
import { visitorsApi } from '../../api/visitors';
import { Field, Input } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { AdminSectionCard } from '../ui/AdminSectionCard';

type IntroPatch = VisitorIntro | null | undefined;

export function VisitorIntroEditor({
  formId,
  value,
  onChange,
  onImagePreviewChange,
  nextBlockOrder,
  multilingual,
}: {
  formId?: string;
  value: IntroPatch;
  onChange: (intro: IntroPatch) => void;
  onImagePreviewChange?: (url: string | null) => void;
  nextBlockOrder?: () => number;
  multilingual?: VisitorMultilingual;
}) {
  const toast = useToast((s) => s.push);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const intro = value ?? {};
  const ml = normalizeVisitorLanguages(multilingual);
  const hasImage = Boolean(intro.image);
  const hasVideo = Boolean(intro.video || intro.videoByLocale?.gu || intro.videoByLocale?.hi);

  const blockOrder = () => nextBlockOrder?.() ?? 0;

  const isEmptyIntro = (next: VisitorIntro) =>
    !next.image && !next.video && !next.videoByLocale?.gu && !next.videoByLocale?.hi;

  const patchIntro = (patch: Partial<VisitorIntro>) => {
    const next = { ...intro, ...patch };
    if (isEmptyIntro(next)) onChange(null);
    else onChange(next);
  };

  const getLocaleVideo = (locale: VisitorFormLocale): VisitorIntroVideo | undefined => {
    if (locale === 'en') return intro.video;
    return intro.videoByLocale?.[locale];
  };

  const setLocaleVideo = (locale: VisitorFormLocale, video: VisitorIntroVideo | undefined) => {
    if (locale === 'en') {
      if (!video) {
        const { video: _, ...rest } = intro;
        if (isEmptyIntro(rest as VisitorIntro)) onChange(null);
        else onChange(rest as VisitorIntro);
        return;
      }
      patchIntro({ video });
      return;
    }
    const videoByLocale = { ...intro.videoByLocale };
    if (!video) delete videoByLocale[locale];
    else videoByLocale[locale] = video;
    patchIntro({
      videoByLocale: videoByLocale.gu || videoByLocale.hi ? videoByLocale : undefined,
    });
  };

  const clearAllVideo = () => {
    const { video: _, videoByLocale, ...rest } = intro;
    if (isEmptyIntro(rest as VisitorIntro)) onChange(null);
    else onChange(rest as VisitorIntro);
  };

  const uploadFile = async (kind: 'image' | 'video', file: File, locale: VisitorFormLocale = 'en') => {
    if (!formId) {
      toast('Save the form first to upload media', 'error');
      return;
    }
    const key = kind === 'image' ? 'image' : `video-${locale}`;
    setUploadingKey(key);
    try {
      const result = await visitorsApi.uploadIntroMedia(formId, kind, file, locale);
      if (result.intro) {
        onChange(result.intro);
        if (kind === 'image') {
          if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
          const preview = URL.createObjectURL(file);
          setImagePreviewUrl(preview);
          onImagePreviewChange?.(preview);
        }
      } else if (kind === 'image') {
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        const preview = URL.createObjectURL(file);
        setImagePreviewUrl(preview);
        onImagePreviewChange?.(preview);
        patchIntro({
          image: {
            source: 'upload',
            storageKey: result.storageKey,
            order: intro.image?.order ?? blockOrder(),
          },
        });
      } else {
        const sharedOrder = getLocaleVideo(locale)?.order ?? blockOrder();
        const sharedMandatory = getLocaleVideo(locale)?.viewingMandatory ?? false;
        setLocaleVideo(locale, {
          source: 'upload',
          storageKey: result.storageKey,
          viewingMandatory: sharedMandatory,
          order: sharedOrder,
        });
      }
      toast('Intro media uploaded; drag it in the list below to choose placement', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setUploadingKey(null);
    }
  };

  const videoLocales: VisitorFormLocale[] = ml.enabled ? ml.languages : ['en'];

  return (
    <AdminSectionCard title="Form Intro" className="mt-4 mb-8 !h-auto">
      <div className="space-y-3">
        <p className="text-xs text-text-muted">
          Add a header image and/or intro video, then drag them between questions in the list below.
          {ml.enabled && ' Set a different intro video per language if needed.'}
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={hasImage}
              onChange={(e) => {
                if (e.target.checked) {
                  patchIntro({
                    image: { source: 'url', url: '', order: intro.image?.order ?? blockOrder() },
                  });
                } else {
                  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                  setImagePreviewUrl(null);
                  onImagePreviewChange?.(null);
                  const { image: _, ...rest } = intro;
                  if (isEmptyIntro(rest as VisitorIntro)) onChange(null);
                  else onChange(rest as VisitorIntro);
                }
              }}
            />
            Add header image
          </label>
          {hasImage && intro.image && (
            <div className="ml-6 space-y-2 p-4">
              <div className="flex gap-4 text-sm mb-6">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    checked={intro.image.source === 'url'}
                    onChange={() =>
                      patchIntro({
                        image: {
                          source: 'url',
                          url: intro.image?.url ?? '',
                          order: intro.image?.order ?? blockOrder(),
                        },
                      })
                    }
                  />
                  Image URL
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    checked={intro.image.source === 'upload'}
                    onChange={() =>
                      patchIntro({
                        image: {
                          source: 'upload',
                          storageKey: intro.image?.storageKey,
                          order: intro.image?.order ?? blockOrder(),
                        },
                      })
                    }
                    disabled={!formId}
                  />
                  Upload
                </label>
              </div>
              {intro.image.source === 'url' ? (
                <Field label="Image URL">
                  <Input
                    value={intro.image.url ?? ''}
                    onChange={(e) =>
                      patchIntro({
                        image: {
                          source: 'url',
                          url: e.target.value,
                          order: intro.image?.order ?? blockOrder(),
                        },
                      })
                    }
                    placeholder="https://…"
                  />
                </Field>
              ) : (
                <div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFile('image', f);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    className="btn-outline text-sm"
                    disabled={!formId || uploadingKey === 'image'}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    {uploadingKey === 'image'
                      ? 'Uploading…'
                      : intro.image.storageKey
                        ? 'Replace image'
                        : 'Choose image'}
                  </button>
                  {!formId && (
                    <p className="text-xs text-text-muted mt-1">Save the form first to enable uploads.</p>
                  )}
                  {intro.image.storageKey && (
                    <p className="text-xs text-green mt-1">Image uploaded</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={hasVideo}
              onChange={(e) => {
                if (e.target.checked) {
                  setLocaleVideo('en', {
                    source: 'youtube',
                    url: '',
                    viewingMandatory: false,
                    order: intro.video?.order ?? blockOrder(),
                  });
                } else {
                  clearAllVideo();
                }
              }}
            />
            Add intro video
          </label>
          {hasVideo && (
            <div className="ml-6 space-y-4">
              {videoLocales.map((locale) => {
                const video = getLocaleVideo(locale);
                const uploadKey = `video-${locale}`;
                return (
                  <div
                    key={locale}
                    className="p-3 rounded-md border border-border/60 bg-surface2/30 space-y-2"
                  >
                    <p className="text-sm font-medium mb-4 mt-2">
                      Intro video ({VISITOR_FORM_LOCALE_LABELS[locale]})
                      {locale !== 'en' && (
                        <span className="text-xs text-text-muted font-normal ml-2">
                          Optional, falls back to English
                        </span>
                      )}
                    </p>
                    {!video ? (
                      <button
                        type="button"
                        className="btn-outline text-sm"
                        onClick={() =>
                          setLocaleVideo(locale, {
                            source: 'youtube',
                            url: '',
                            viewingMandatory: intro.video?.viewingMandatory ?? false,
                            order: intro.video?.order ?? blockOrder(),
                          })
                        }
                      >
                        Add {VISITOR_FORM_LOCALE_LABELS[locale]} video
                      </button>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-8 text-sm p-3">
                          {(['youtube', 'loom', 'upload'] as const).map((src) => (
                            <label key={src} className="flex items-center gap-1 cursor-pointer capitalize">
                              <input
                                type="radio"
                                checked={video.source === src}
                                onChange={() =>
                                  setLocaleVideo(locale, {
                                    source: src,
                                    url: src === 'upload' ? undefined : '',
                                    storageKey: src === 'upload' ? video.storageKey : undefined,
                                    viewingMandatory: video.viewingMandatory ?? false,
                                    order: video.order ?? blockOrder(),
                                  })
                                }
                                disabled={src === 'upload' && !formId}
                              />
                              {src === 'youtube' ? 'YouTube' : src === 'loom' ? 'Loom' : 'Upload'}
                            </label>
                          ))}
                        </div>
                        {video.source === 'youtube' && (
                          <Field label="YouTube URL">
                            <Input
                              value={video.url ?? ''}
                              onChange={(e) =>
                                setLocaleVideo(locale, { ...video, source: 'youtube', url: e.target.value })
                              }
                              placeholder="https://youtube.com/watch?v=…"
                            />
                            {video.url && !normalizeYoutubeUrl(video.url) && (
                              <p className="text-xs text-red mt-1">Enter a valid YouTube URL</p>
                            )}
                          </Field>
                        )}
                        {video.source === 'loom' && (
                          <Field label="Loom share URL">
                            <Input
                              value={video.url ?? ''}
                              onChange={(e) =>
                                setLocaleVideo(locale, { ...video, source: 'loom', url: e.target.value })
                              }
                              placeholder="https://www.loom.com/share/…"
                            />
                            {video.url && !normalizeLoomUrl(video.url) && (
                              <p className="text-xs text-red mt-1">Enter a valid Loom share URL</p>
                            )}
                          </Field>
                        )}
                        {video.source === 'upload' && (
                          <div>
                            <input
                              type="file"
                              accept="video/mp4,video/webm"
                              className="hidden"
                              id={`intro-video-upload-${locale}`}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadFile('video', f, locale);
                                e.target.value = '';
                              }}
                            />
                            <button
                              type="button"
                              className="btn-outline text-sm"
                              disabled={!formId || uploadingKey === uploadKey}
                              onClick={() =>
                                document.getElementById(`intro-video-upload-${locale}`)?.click()
                              }
                            >
                              {uploadingKey === uploadKey
                                ? 'Uploading…'
                                : video.storageKey
                                  ? 'Replace video'
                                  : 'Choose video (mp4/webm)'}
                            </button>
                            {video.storageKey && (
                              <p className="text-xs text-green mt-1">Video uploaded</p>
                            )}
                          </div>
                        )}
                        {locale === 'en' && (
                          <label className="flex items-center gap-2 text-sm cursor-pointer !mt-6">
                            <input
                              type="checkbox"
                              checked={video.viewingMandatory}
                              onChange={(e) =>
                                setLocaleVideo(locale, { ...video, viewingMandatory: e.target.checked })
                              }
                            />
                            Viewing is mandatory (visitor must watch to the end before submitting)
                          </label>
                        )}
                        <button
                          type="button"
                          className="text-xs mt-4 text-text-muted hover:text-red !mt-8"
                          onClick={() => setLocaleVideo(locale, undefined)}
                        >
                          Remove {VISITOR_FORM_LOCALE_LABELS[locale]} video
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminSectionCard>
  );
}
