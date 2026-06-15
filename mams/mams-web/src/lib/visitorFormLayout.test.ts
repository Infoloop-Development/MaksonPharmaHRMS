import { describe, expect, it } from 'vitest';
import {
  VISITOR_INTRO_IMAGE_FIELD_ID,
  VISITOR_INTRO_VIDEO_FIELD_ID,
  applyVisitorFormLayout,
  buildVisitorFormLayout,
  nextVisitorFormLayoutOrder,
  type VisitorField,
} from '@mams/types';

const fields: VisitorField[] = [
  { id: 'a', type: 'short_text', label: 'Name', required: true, order: 0 },
  { id: 'b', type: 'email', label: 'Email', required: true, order: 2 },
];

describe('visitorFormLayout', () => {
  it('places legacy intro blocks before fields when order is missing', () => {
    const legacyFields: VisitorField[] = [
      { id: 'a', type: 'short_text', label: 'Name', required: true, order: 0 },
      { id: 'b', type: 'email', label: 'Email', required: true, order: 1 },
    ];
    const layout = buildVisitorFormLayout(
      {
        image: { source: 'url', url: 'https://example.com/a.jpg' },
        video: { source: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', viewingMandatory: false },
      },
      legacyFields
    );
    expect(layout.map((i) => i.kind)).toEqual(['intro_image', 'intro_video', 'field', 'field']);
  });

  it('sorts intro video between fields by order', () => {
    const layout = buildVisitorFormLayout(
      {
        video: {
          source: 'upload',
          storageKey: 'vid',
          viewingMandatory: false,
          order: 1,
        },
      },
      fields
    );
    expect(layout.map((i) => i.id)).toEqual(['a', VISITOR_INTRO_VIDEO_FIELD_ID, 'b']);
  });

  it('applyVisitorFormLayout rewrites contiguous orders', () => {
    const ids = ['a', VISITOR_INTRO_VIDEO_FIELD_ID, 'b'];
    const { intro, fields: nextFields } = applyVisitorFormLayout(
      ids,
      {
        video: { source: 'upload', storageKey: 'v', viewingMandatory: true },
      },
      fields
    );
    expect(nextFields.map((f) => f.order)).toEqual([0, 2]);
    expect(intro?.video?.order).toBe(1);
  });

  it('nextVisitorFormLayoutOrder appends after existing items', () => {
    expect(
      nextVisitorFormLayoutOrder(
        { image: { source: 'url', url: 'https://example.com/x.jpg', order: 0 } },
        fields
      )
    ).toBe(3);
  });

  it('includes intro image in layout ids', () => {
    const layout = buildVisitorFormLayout(
      { image: { source: 'upload', storageKey: 'img', order: 2 } },
      fields
    );
    expect(layout.some((i) => i.id === VISITOR_INTRO_IMAGE_FIELD_ID)).toBe(true);
  });

  it('includes intro video in layout when only videoByLocale.gu exists', () => {
    const layout = buildVisitorFormLayout(
      {
        videoByLocale: {
          gu: { source: 'upload', storageKey: 'gu-vid', viewingMandatory: false, order: 1 },
        },
      },
      fields
    );
    expect(layout.map((i) => i.id)).toEqual(['a', VISITOR_INTRO_VIDEO_FIELD_ID, 'b']);
  });

  it('applyVisitorFormLayout preserves gu-only videoByLocale intro on save', () => {
    const intro = {
      videoByLocale: {
        gu: { source: 'upload' as const, storageKey: 'gu-vid', viewingMandatory: false },
      },
    };
    const ids = ['a', VISITOR_INTRO_VIDEO_FIELD_ID, 'b'];
    const { intro: saved } = applyVisitorFormLayout(ids, intro, fields);
    expect(saved).not.toBeNull();
    expect(saved?.videoByLocale?.gu?.storageKey).toBe('gu-vid');
    expect(saved?.video).toBeUndefined();
  });

  it('applyVisitorFormLayout updates videoByLocale.gu order on drag-reorder', () => {
    const intro = {
      videoByLocale: {
        gu: { source: 'upload' as const, storageKey: 'gu-vid', viewingMandatory: false },
      },
    };
    const ids = ['a', VISITOR_INTRO_VIDEO_FIELD_ID, 'b'];
    const { intro: saved } = applyVisitorFormLayout(ids, intro, fields);
    expect(saved?.videoByLocale?.gu?.order).toBe(1);
  });
});
