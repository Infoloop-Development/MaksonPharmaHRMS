/** Reserved VisitorFile fieldIds for form intro assets. */
import type { VisitorFormLocale } from './visitorLocales.js';

export const VISITOR_INTRO_IMAGE_FIELD_ID = '__intro_image__';
export const VISITOR_INTRO_VIDEO_FIELD_ID = '__intro_video__';

export function visitorIntroVideoFieldId(locale: VisitorFormLocale): string {
  return locale === 'en' ? VISITOR_INTRO_VIDEO_FIELD_ID : `__intro_video_${locale}__`;
}

const YOUTUBE_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be']);

export function parseYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withProto = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (!YOUTUBE_HOSTS.has(u.hostname) && host !== 'youtube.com') return null;
    if (u.pathname.startsWith('/shorts/')) {
      const id = u.pathname.split('/')[2];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    const v = u.searchParams.get('v');
    return v && /^[\w-]{11}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function parseLoomVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withProto = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    if (!u.hostname.includes('loom.com')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    const shareIdx = parts.indexOf('share');
    if (shareIdx >= 0 && parts[shareIdx + 1]) {
      return parts[shareIdx + 1]!;
    }
    if (parts[0] === 'embed' && parts[1]) return parts[1];
    return null;
  } catch {
    return null;
  }
}

export function normalizeYoutubeUrl(input: string): string | null {
  const id = parseYoutubeVideoId(input);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

export function normalizeLoomUrl(input: string): string | null {
  const id = parseLoomVideoId(input);
  return id ? `https://www.loom.com/share/${id}` : null;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`;
}

export function loomEmbedUrl(videoId: string): string {
  return `https://www.loom.com/embed/${videoId}`;
}

export function isAllowedIntroImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}
