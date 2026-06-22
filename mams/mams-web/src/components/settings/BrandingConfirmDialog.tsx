import { useEffect, useRef, useState } from 'react';
import type { OrgBranding } from '@mams/types';
import { contrastTextOnBackground, fontFamilyStack } from '../../lib/orgBrandingTheme';

const COUNTDOWN_SECONDS = 15;

export function BrandingConfirmDialog({
  open,
  secondsLeft: initialSeconds = COUNTDOWN_SECONDS,
  busy,
  onKeep,
  onRevert,
}: {
  open: boolean;
  secondsLeft?: number;
  busy?: boolean;
  onKeep: () => void;
  onRevert: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const onRevertRef = useRef(onRevert);
  onRevertRef.current = onRevert;

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(initialSeconds);
    let remaining = initialSeconds;
    const id = window.setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(id);
        onRevertRef.current();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, initialSeconds]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-surface rounded-lg shadow-floating w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal
        aria-labelledby="branding-confirm-title"
      >
        <div className="px-6 py-5">
          <h2 id="branding-confirm-title" className="text-lg font-semibold text-text">
            Keep these branding changes?
          </h2>
          <p className="text-sm text-text-muted mt-2">
            This is a system-wide change. All users will see the updated colors and font across the application.
          </p>
          <p className="text-sm text-text mt-3">
            Reverting to previous branding in <strong>{secondsLeft}</strong> seconds.
          </p>
        </div>
        <div className="px-6 py-4 bg-surface2 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" className="btn-outline" disabled={busy} onClick={onKeep}>
            {busy ? 'Saving…' : 'Keep changes'}
          </button>
          <button type="button" className="btn-primary" disabled={busy} onClick={onRevert}>
            Revert
          </button>
        </div>
      </div>
    </div>
  );
}

export function BrandThemeMiniPreview({ branding }: { branding: OrgBranding }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden flex h-28">
      <div
        className="w-28 shrink-0 p-3 flex flex-col text-xs"
        style={{ background: branding.primaryColor, color: 'var(--sidebar-text)' }}
      >
        <div className="font-semibold shrink-0">Nav</div>
        <div
          className="flex-1 flex items-center justify-center text-lg leading-none"
          style={{ fontFamily: fontFamilyStack(branding.fontFamily) }}
        >
          Abc
        </div>
        <div className="h-1 w-4 rounded-full shrink-0" style={{ background: branding.secondaryColor }} />
      </div>
      <div className="flex-1 p-3 bg-surface flex flex-col justify-center gap-2">
        <div className="text-xs text-text-muted" style={{ fontFamily: fontFamilyStack(branding.fontFamily) }}>
          Sample heading
        </div>
        <button
          type="button"
          className="btn btn-sm w-fit pointer-events-none"
          style={{
            fontFamily: fontFamilyStack(branding.fontFamily),
            backgroundColor: branding.primaryColor,
            color: contrastTextOnBackground(branding.primaryColor),
          }}
        >
          Primary button
        </button>
      </div>
    </div>
  );
}
