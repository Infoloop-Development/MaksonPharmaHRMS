import type { VisitorIntro } from '@mams/types';
import { resolveIntroImageUrl } from '../../lib/visitorIntroUrls';
import { VisitorVideoPlayer } from './VisitorVideoPlayer';

export function VisitorIntroDisplay({
  intro,
  slug,
  imagePreviewUrl,
  onVideoCompleted,
  videoCompleted,
}: {
  intro?: VisitorIntro | null;
  slug?: string;
  imagePreviewUrl?: string;
  onVideoCompleted?: () => void;
  videoCompleted?: boolean;
}) {
  if (!intro?.image && !intro?.video) return null;

  const imageUrl = intro ? resolveIntroImageUrl(intro, slug, imagePreviewUrl) : null;
  const mandatory = intro?.video?.viewingMandatory ?? false;

  return (
    <div className="mb-6 space-y-4">
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="w-full max-h-48 object-cover rounded-md border border-border"
        />
      )}
      {intro?.video && (
        <div>
          <VisitorVideoPlayer video={intro.video} slug={slug} onCompleted={onVideoCompleted} />
          {mandatory && (
            <p
              className={`text-xs mt-2 ${videoCompleted ? 'text-green' : 'text-text-muted'}`}
            >
              {videoCompleted
                ? '✓ Intro video completed'
                : 'Please watch the full intro video before submitting.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
