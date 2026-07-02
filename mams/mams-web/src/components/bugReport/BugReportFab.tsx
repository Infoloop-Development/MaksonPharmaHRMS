import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { captureViewportScreenshot } from '../../lib/bugReport';
import { BugReportModal } from './BugReportModal';

const HIDDEN_PREFIXES = ['/login', '/change-password', '/visit/'];

export function BugReportFab() {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const hidden =
    !user ||
    HIDDEN_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(p));

  if (hidden) return null;

  const onOpen = async () => {
    setCapturing(true);
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      const shot = await captureViewportScreenshot();
      setScreenshot(shot);
      setOpen(true);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <>
      <button
        type="button"
        data-bug-report-ignore
        className={`fixed bottom-20 lg:bottom-6 right-4 z-[80] btn-primary shadow-floating rounded-full px-4 py-2.5 text-sm font-semibold touch-target transition-opacity ${
          capturing ? 'opacity-0 pointer-events-none' : ''
        }`}
        onClick={() => void onOpen()}
        disabled={capturing}
        aria-label="Report bug"
      >
        {capturing ? 'Capturing…' : 'Report Bug'}
      </button>
      <BugReportModal
        open={open}
        onClose={() => {
          setOpen(false);
          setScreenshot(null);
        }}
        screenshotPreview={screenshot}
      />
    </>
  );
}
