import { useEffect, useRef } from 'react';

type Props = {
  stream: MediaStream | null;
  /** Inline circle above sidebar footer controls (fixed, not draggable). */
  inline?: boolean;
};

export function BugReportRecordingPip({ stream, inline = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
  }, [stream]);

  if (!stream) return null;

  if (inline) {
    return (
      <div data-bug-report-ignore className="flex justify-center py-1" role="img" aria-label="Webcam preview">
        <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white/70 bug-report-recording-pip">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      data-bug-report-ignore
      className="bug-report-recording-pip fixed z-[86] left-3"
      style={{ bottom: 'max(11rem, calc(6.5rem + env(safe-area-inset-bottom)))' }}
      role="img"
      aria-label="Webcam preview"
    >
      <div className="relative w-[4.5rem] h-[4.5rem] rounded-full overflow-hidden border-2 border-white/80 shadow-floating">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
      </div>
    </div>
  );
}
