import { useCallback, useEffect, useRef, useState } from 'react';

export function BugReportClickSpotlight({ active }: { active: boolean }) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-bug-report-ignore]')) return;

      const id = ++idRef.current;
      setRipples((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 700);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [active]);

  if (!active || ripples.length === 0) return null;

  return (
    <div className="bug-report-click-spotlight-layer pointer-events-none fixed inset-0 z-[85]" aria-hidden>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="bug-report-click-ripple"
          style={{ left: r.x, top: r.y }}
        />
      ))}
    </div>
  );
}

export function useDraggable(initial: { x: number; y: number }) {
  const [pos, setPos] = useState(initial);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos.x, pos.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPos({
      x: dragRef.current.originX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.originY + (e.clientY - dragRef.current.startY),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return { pos, onPointerDown, onPointerMove, onPointerUp };
}
