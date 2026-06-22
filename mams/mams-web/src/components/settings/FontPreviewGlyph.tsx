import { fontFamilyStack } from '../../lib/orgBrandingTheme';

const SIZE_CLASS = {
  md: 'w-9 h-9 text-sm',
  sm: 'w-7 h-7 text-[11px]',
} as const;

export function FontPreviewGlyph({
  font,
  size = 'md',
  'aria-label': ariaLabel,
}: {
  font: string;
  size?: keyof typeof SIZE_CLASS;
  'aria-label'?: string;
}) {
  return (
    <span
      role="img"
      aria-label={ariaLabel ?? `${font} preview`}
      className={`inline-flex items-center justify-center shrink-0 rounded-md border border-border bg-surface2 font-semibold text-text ${SIZE_CLASS[size]}`}
      style={{ fontFamily: fontFamilyStack(font) }}
    >
      Aa
    </span>
  );
}
