import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type TooltipSide = 'top' | 'bottom';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function Tooltip({
  content,
  side = 'top',
  maxWidth = 280,
  children,
}: {
  content: string;
  side?: TooltipSide;
  maxWidth?: number;
  children: ReactNode;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const top = side === 'top' ? rect.top - 8 : rect.bottom + 8;
    setCoords({
      top,
      left: clamp(centerX, 12, window.innerWidth - 12),
    });
  }, [side]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!content.trim()) {
    return <>{children}</>;
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="tooltip-trigger inline-flex"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open ? id : undefined}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            className={`ui-tooltip ui-tooltip--${side}`}
            style={{
              top: coords.top,
              left: coords.left,
              maxWidth,
              transform: side === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}

export function InfoTip({
  content,
  side = 'top',
  className = '',
  label = 'More information',
}: {
  content: string;
  side?: TooltipSide;
  className?: string;
  label?: string;
}) {
  if (!content.trim()) return null;

  return (
    <Tooltip content={content} side={side}>
      <button
        type="button"
        className={`info-tip ${className}`.trim()}
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden>i</span>
      </button>
    </Tooltip>
  );
}
