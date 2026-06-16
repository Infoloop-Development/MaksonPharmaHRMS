import type { VisitorIntro, VisitorIntroVideo } from '@mams/types';
import {
  normalizeLoomUrl,
  normalizeYoutubeUrl,
  parseLoomVideoId,
  parseYoutubeVideoId,
  VISITOR_INTRO_IMAGE_FIELD_ID,
  VISITOR_INTRO_VIDEO_FIELD_ID,
  visitorIntroVideoFieldId,
} from '@mams/types';
import type { VisitorFormLocale } from '@mams/types';

export { VISITOR_INTRO_IMAGE_FIELD_ID, VISITOR_INTRO_VIDEO_FIELD_ID, visitorIntroVideoFieldId };

/** Convert mongoose subdocuments to plain objects for serialization. */
export function plainIntro(intro: VisitorIntro | null | undefined): VisitorIntro | null {
  if (!intro) return null;
  const raw =
    typeof (intro as { toObject?: () => VisitorIntro }).toObject === 'function'
      ? (intro as { toObject: () => VisitorIntro }).toObject()
      : intro;
  return JSON.parse(JSON.stringify(raw)) as VisitorIntro;
}

function normalizeIntroVideo(video: VisitorIntroVideo): VisitorIntroVideo {
  const out = { ...video };
  if (out.source === 'youtube' && out.url) {
    out.url = normalizeYoutubeUrl(out.url) ?? out.url;
    out.storageKey = undefined;
  } else if (out.source === 'loom' && out.url) {
    out.url = normalizeLoomUrl(out.url) ?? out.url;
    out.storageKey = undefined;
  } else if (out.source === 'upload') {
    out.url = undefined;
  }
  return out;
}

function serializeIntroVideoForPublic(
  video: VisitorIntroVideo,
  slug: string,
  mediaUrl: (storageKey: string) => string
): VisitorIntroVideo {
  const out = { ...video };
  if (out.source === 'upload' && out.storageKey) {
    out.url = mediaUrl(out.storageKey);
  }
  if (out.source === 'youtube' && out.url) {
    const id = parseYoutubeVideoId(out.url);
    if (id) out.url = `https://www.youtube.com/watch?v=${id}`;
  }
  if (out.source === 'loom' && out.url) {
    const id = parseLoomVideoId(out.url);
    if (id) out.url = `https://www.loom.com/share/${id}`;
  }
  return out;
}

/** Normalize intro URLs before persisting. */
export function normalizeIntroForStorage(intro: VisitorIntro | undefined | null): VisitorIntro | null {
  if (!intro) return null;
  const out: VisitorIntro = {};
  if (intro.image) {
    out.image = { ...intro.image };
    if (out.image.source === 'url' && out.image.url) {
      out.image.storageKey = undefined;
    }
    if (out.image.source === 'upload') {
      out.image.url = undefined;
    }
  }
  if (intro.video) {
    out.video = normalizeIntroVideo(intro.video);
  }
  if (intro.videoByLocale) {
    const byLocale: NonNullable<VisitorIntro['videoByLocale']> = {};
    if (intro.videoByLocale.gu) byLocale.gu = normalizeIntroVideo(intro.videoByLocale.gu);
    if (intro.videoByLocale.hi) byLocale.hi = normalizeIntroVideo(intro.videoByLocale.hi);
    if (byLocale.gu || byLocale.hi) out.videoByLocale = byLocale;
  }
  if (!out.image && !out.video && !out.videoByLocale) return null;
  return out;
}

export function serializeIntroForPublic(
  intro: VisitorIntro | null | undefined,
  slug: string
): VisitorIntro | undefined {
  const plain = plainIntro(intro ?? null);
  if (!plain) return undefined;
  const mediaUrl = (storageKey: string) =>
    `/api/public/visitor-forms/${encodeURIComponent(slug)}/intro-media/${encodeURIComponent(storageKey)}`;

  const out: VisitorIntro = {};
  if (plain.image) {
    out.image = { ...plain.image };
    if (out.image.source === 'upload' && out.image.storageKey) {
      out.image.url = mediaUrl(out.image.storageKey);
    }
  }
  if (plain.video) {
    out.video = serializeIntroVideoForPublic(plain.video, slug, mediaUrl);
  }
  if (plain.videoByLocale) {
    const byLocale: NonNullable<VisitorIntro['videoByLocale']> = {};
    if (plain.videoByLocale.gu) {
      byLocale.gu = serializeIntroVideoForPublic(plain.videoByLocale.gu, slug, mediaUrl);
    }
    if (plain.videoByLocale.hi) {
      byLocale.hi = serializeIntroVideoForPublic(plain.videoByLocale.hi, slug, mediaUrl);
    }
    if (byLocale.gu || byLocale.hi) out.videoByLocale = byLocale;
  }
  if (!out.image && !out.video && !out.videoByLocale) return undefined;
  return out;
}

function videoMatchesStorageKey(video: VisitorIntroVideo | undefined, storageKey: string): boolean {
  return video?.source === 'upload' && video.storageKey === storageKey;
}

export function introUsesStorageKey(intro: VisitorIntro | null | undefined, storageKey: string): boolean {
  const plain = plainIntro(intro ?? null);
  if (!plain) return false;
  return (
    (plain.image?.source === 'upload' && plain.image.storageKey === storageKey) ||
    videoMatchesStorageKey(plain.video, storageKey) ||
    videoMatchesStorageKey(plain.videoByLocale?.gu, storageKey) ||
    videoMatchesStorageKey(plain.videoByLocale?.hi, storageKey)
  );
}

export function introVideoFieldIdForStorageKey(
  intro: VisitorIntro | null | undefined,
  storageKey: string
): string | null {
  const plain = plainIntro(intro ?? null);
  if (!plain) return null;
  if (plain.image?.storageKey === storageKey) return VISITOR_INTRO_IMAGE_FIELD_ID;
  if (plain.video?.storageKey === storageKey) return VISITOR_INTRO_VIDEO_FIELD_ID;
  if (plain.videoByLocale?.gu?.storageKey === storageKey) return visitorIntroVideoFieldId('gu');
  if (plain.videoByLocale?.hi?.storageKey === storageKey) return visitorIntroVideoFieldId('hi');
  return null;
}

export { visitorIntroVideoFieldId as introVideoFieldIdForLocale };
