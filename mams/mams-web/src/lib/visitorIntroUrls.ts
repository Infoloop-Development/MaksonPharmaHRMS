import type { VisitorIntro, VisitorIntroVideo } from '@mams/types';

function apiBase(): string {
  const apiRoot = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  return apiRoot ? apiRoot.replace(/\/$/, '') : '';
}

export function publicIntroMediaUrl(slug: string, storageKey: string): string {
  const base = apiBase();
  const path = `/api/public/visitor-forms/${encodeURIComponent(slug)}/intro-media/${encodeURIComponent(storageKey)}`;
  return base ? `${base}${path}` : path;
}

function resolveMediaPath(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = apiBase();
  if (url.startsWith('/api/') && base) return `${base}${url}`;
  return url;
}

export function resolveIntroImageUrl(
  intro: VisitorIntro,
  slug?: string,
  imagePreviewUrl?: string
): string | null {
  if (!intro.image) return null;
  if (imagePreviewUrl) return imagePreviewUrl;
  if (intro.image.source === 'url' && intro.image.url) return intro.image.url;
  if (intro.image.source === 'upload') {
    if (intro.image.url) return resolveMediaPath(intro.image.url);
    if (intro.image.storageKey && slug) return publicIntroMediaUrl(slug, intro.image.storageKey);
  }
  return null;
}

export function resolveIntroVideoUrl(video: VisitorIntroVideo, slug?: string): string | null {
  if (video.source === 'upload') {
    if (video.url) return resolveMediaPath(video.url);
    if (video.storageKey && slug) return publicIntroMediaUrl(slug, video.storageKey);
    return null;
  }
  return video.url ?? null;
}
