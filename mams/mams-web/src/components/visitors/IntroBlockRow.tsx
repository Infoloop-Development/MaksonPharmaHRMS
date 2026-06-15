import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { VisitorIntro } from '@mams/types';
import { VISITOR_INTRO_IMAGE_FIELD_ID, VISITOR_INTRO_VIDEO_FIELD_ID } from '@mams/types';

function DragHandle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="text-text-muted">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

export function IntroBlockDragGhost({ kind }: { kind: 'intro_image' | 'intro_video' }) {
  const label = kind === 'intro_image' ? 'Header image' : 'Intro video';
  return (
    <div className="form-field-drag-overlay card p-3 border-2 border-primary shadow-floating">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Intro</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}

function blockLabel(kind: 'intro_image' | 'intro_video', intro: VisitorIntro | null | undefined): string {
  if (kind === 'intro_image') {
    if (intro?.image?.source === 'upload') return 'Header image (uploaded)';
    if (intro?.image?.url) return 'Header image (URL)';
    return 'Header image';
  }
  if (intro?.video?.source === 'upload') return 'Intro video (uploaded)';
  if (intro?.video?.source === 'youtube') return 'Intro video (YouTube)';
  if (intro?.video?.source === 'loom') return 'Intro video (Loom)';
  return 'Intro video';
}

export function IntroBlockRow({
  kind,
  intro,
  selected,
  onSelect,
}: {
  kind: 'intro_image' | 'intro_video';
  intro: VisitorIntro | null | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const id = kind === 'intro_image' ? VISITOR_INTRO_IMAGE_FIELD_ID : VISITOR_INTRO_VIDEO_FIELD_ID;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const mandatory = kind === 'intro_video' && intro?.video?.viewingMandatory;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card p-3 mb-2 cursor-pointer border-2 transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'border-transparent hover:border-border'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 p-1 rounded hover:bg-surface2 touch-none cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <DragHandle />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Intro</span>
            <span className="text-sm font-medium">{blockLabel(kind, intro)}</span>
            {mandatory && <span className="text-xs text-amber-600">Mandatory viewing</span>}
          </div>
          <p className="text-xs text-text-muted mt-1">
            Drag to place before, after, or between questions. Edit settings in Form intro above.
          </p>
        </div>
      </div>
    </div>
  );
}
