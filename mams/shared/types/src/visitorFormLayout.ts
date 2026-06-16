import type { VisitorField, VisitorIntro } from './visitor.js';
import { VISITOR_INTRO_IMAGE_FIELD_ID, VISITOR_INTRO_VIDEO_FIELD_ID } from './visitorIntroMedia.js';

export { VISITOR_INTRO_IMAGE_FIELD_ID, VISITOR_INTRO_VIDEO_FIELD_ID };

/** Sort intro blocks before fields when `order` was never set (legacy forms). */
const LEGACY_INTRO_IMAGE_ORDER = -10_000;
const LEGACY_INTRO_VIDEO_ORDER = -9_999;

export type VisitorFormLayoutItem =
  | { kind: 'intro_image'; id: typeof VISITOR_INTRO_IMAGE_FIELD_ID; order: number }
  | { kind: 'intro_video'; id: typeof VISITOR_INTRO_VIDEO_FIELD_ID; order: number }
  | { kind: 'field'; id: string; order: number; field: VisitorField };

export function buildVisitorFormLayout(
  intro: VisitorIntro | null | undefined,
  fields: VisitorField[]
): VisitorFormLayoutItem[] {
  const items: VisitorFormLayoutItem[] = fields.map((f) => ({
    kind: 'field',
    id: f.id,
    order: f.order,
    field: f,
  }));

  if (intro?.image) {
    items.push({
      kind: 'intro_image',
      id: VISITOR_INTRO_IMAGE_FIELD_ID,
      order: intro.image.order ?? LEGACY_INTRO_IMAGE_ORDER,
    });
  }
  if (intro?.video) {
    items.push({
      kind: 'intro_video',
      id: VISITOR_INTRO_VIDEO_FIELD_ID,
      order: intro.video.order ?? LEGACY_INTRO_VIDEO_ORDER,
    });
  } else if (intro?.videoByLocale?.gu || intro?.videoByLocale?.hi) {
    const order =
      intro.videoByLocale.gu?.order ??
      intro.videoByLocale.hi?.order ??
      LEGACY_INTRO_VIDEO_ORDER;
    items.push({
      kind: 'intro_video',
      id: VISITOR_INTRO_VIDEO_FIELD_ID,
      order,
    });
  }

  return items.sort((a, b) => a.order - b.order);
}

/** Next `order` value when appending a new block to the layout. */
export function nextVisitorFormLayoutOrder(
  intro: VisitorIntro | null | undefined,
  fields: VisitorField[]
): number {
  const items = buildVisitorFormLayout(intro, fields);
  if (items.length === 0) return 0;
  const max = Math.max(...items.map((i) => i.order));
  return (max < 0 ? items.length : max) + 1;
}

/** Apply a top-to-bottom item order (contiguous 0..n-1). */
export function applyVisitorFormLayout(
  orderedIds: string[],
  intro: VisitorIntro | null | undefined,
  fields: VisitorField[]
): { intro: VisitorIntro | null; fields: VisitorField[] } {
  const fieldMap = new Map(fields.map((f) => [f.id, f]));
  let nextIntro: VisitorIntro | null = intro ? { ...intro } : null;
  const nextFields: VisitorField[] = [];

  orderedIds.forEach((id, order) => {
    if (id === VISITOR_INTRO_IMAGE_FIELD_ID) {
      if (nextIntro?.image) {
        nextIntro = { ...nextIntro, image: { ...nextIntro.image, order } };
      }
      return;
    }
    if (id === VISITOR_INTRO_VIDEO_FIELD_ID) {
      if (nextIntro?.video) {
        nextIntro = { ...nextIntro, video: { ...nextIntro.video, order } };
      }
      if (nextIntro?.videoByLocale?.gu) {
        nextIntro = {
          ...nextIntro,
          videoByLocale: {
            ...nextIntro.videoByLocale,
            gu: { ...nextIntro.videoByLocale.gu, order },
          },
        };
      }
      if (nextIntro?.videoByLocale?.hi) {
        nextIntro = {
          ...nextIntro,
          videoByLocale: {
            ...nextIntro.videoByLocale,
            hi: { ...nextIntro.videoByLocale.hi, order },
          },
        };
      }
      return;
    }
    const field = fieldMap.get(id);
    if (field) nextFields.push({ ...field, order });
  });

  const hasLocaleVideo = Boolean(nextIntro?.videoByLocale?.gu || nextIntro?.videoByLocale?.hi);
  if (nextIntro && !nextIntro.image && !nextIntro.video && !hasLocaleVideo) nextIntro = null;
  return { intro: nextIntro, fields: nextFields };
}
