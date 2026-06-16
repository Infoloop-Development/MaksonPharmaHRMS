import type { ReactNode } from 'react';
import type { VisitorField, VisitorFormLocale, VisitorIntro } from '@mams/types';
import { buildVisitorFormLayout, getIntroVideoForLocale, introForLocale } from '@mams/types';
import { resolveIntroImageUrl } from '../../lib/visitorIntroUrls';
import { FormFieldPreview } from './FormFieldRow';
import { VisitorVideoPlayer } from './VisitorVideoPlayer';

export function VisitorFormLayoutPreview({
  intro,
  fields,
  slug,
  imagePreviewUrl,
  title,
  description,
  locale = 'en',
}: {
  intro?: VisitorIntro | null;
  fields: VisitorField[];
  slug?: string;
  imagePreviewUrl?: string;
  title?: string;
  description?: string;
  locale?: VisitorFormLocale;
}) {
  const introForImage = introForLocale(intro ?? null, locale) ?? intro;
  const layout = buildVisitorFormLayout(intro ?? null, fields);
  const localeVideo = getIntroVideoForLocale(intro ?? null, locale);

  return (
    <>
      {title !== undefined && <h3 className="text-lg font-semibold mb-1">{title || 'Untitled form'}</h3>}
      {description && <p className="text-sm text-text-muted mb-4">{description}</p>}
      {layout.map((item) => {
        if (item.kind === 'intro_image' && introForImage?.image) {
          const url = resolveIntroImageUrl(introForImage, slug, imagePreviewUrl);
          if (!url) return null;
          return (
            <img
              key={item.id}
              src={url}
              alt=""
              className="w-full max-h-40 object-cover rounded-md border border-border mb-4"
            />
          );
        }
        if (item.kind === 'intro_video' && localeVideo) {
          const videoKey = `${item.id}-${locale}-${localeVideo.storageKey ?? localeVideo.url ?? ''}`;
          return (
            <div key={videoKey} className="mb-4">
              <VisitorVideoPlayer video={localeVideo} slug={slug} />
            </div>
          );
        }
        if (item.kind === 'field') {
          return <FormFieldPreview key={item.id} field={item.field} />;
        }
        return null;
      })}
    </>
  );
}

export function VisitorFormLayoutPublic({
  intro,
  fields,
  slug,
  imagePreviewUrl,
  videoCompleted,
  onVideoCompleted,
  renderField,
  locale = 'en',
}: {
  intro?: VisitorIntro | null;
  fields: VisitorField[];
  slug?: string;
  imagePreviewUrl?: string;
  videoCompleted?: boolean;
  onVideoCompleted?: () => void;
  renderField: (field: VisitorField) => ReactNode;
  locale?: VisitorFormLocale;
}) {
  const introForImage = introForLocale(intro ?? null, locale) ?? intro;
  const layout = buildVisitorFormLayout(intro ?? null, fields);
  const localeVideo = getIntroVideoForLocale(intro ?? null, locale);
  const mandatory = localeVideo?.viewingMandatory ?? false;

  return (
    <>
      {layout.map((item) => {
        if (item.kind === 'intro_image' && introForImage?.image) {
          const url = resolveIntroImageUrl(introForImage, slug, imagePreviewUrl);
          if (!url) return null;
          return (
            <img
              key={item.id}
              src={url}
              alt=""
              className="w-full max-h-48 object-cover rounded-md border border-border mb-4"
            />
          );
        }
        if (item.kind === 'intro_video' && localeVideo) {
          const videoKey = `${item.id}-${locale}-${localeVideo.storageKey ?? localeVideo.url ?? ''}`;
          return (
            <div key={videoKey} className="mb-4">
              <VisitorVideoPlayer video={localeVideo} slug={slug} onCompleted={onVideoCompleted} />
              {mandatory && (
                <p className={`text-xs mt-2 ${videoCompleted ? 'text-green' : 'text-text-muted'}`}>
                  {videoCompleted
                    ? '✓ Intro video completed'
                    : 'Please watch the full intro video before submitting.'}
                </p>
              )}
            </div>
          );
        }
        if (item.kind === 'field') {
          return <div key={item.id}>{renderField(item.field)}</div>;
        }
        return null;
      })}
    </>
  );
}
