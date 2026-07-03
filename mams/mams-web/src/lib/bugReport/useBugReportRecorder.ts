import { useCallback, useEffect, useRef, useState } from 'react';

export type RecordingPhase = 'idle' | 'acquiring' | 'recording' | 'paused' | 'stopped' | 'error';
export type RecordingMode = 'screen' | 'screen_webcam';

const MAX_DURATION_MS = 5 * 60 * 1000;

function pickRecorderMimeType(): string {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}

function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function isBugReportRecordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getDisplayMedia) &&
    typeof MediaRecorder !== 'undefined'
  );
}

export function useBugReportRecorder() {
  const [phase, setPhase] = useState<RecordingPhase>('idle');
  const [mode, setMode] = useState<RecordingMode>('screen');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [webcamPreviewStream, setWebcamPreviewStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const pausedAccumRef = useRef(0);
  const pauseStartedRef = useRef<number | null>(null);
  const mimeTypeRef = useRef('video/webm');
  const durationMsRef = useRef(0);

  const stopAllTracks = useCallback(() => {
    for (const stream of [displayStreamRef.current, webcamStreamRef.current, micStreamRef.current]) {
      stream?.getTracks().forEach((t) => t.stop());
    }
    displayStreamRef.current = null;
    webcamStreamRef.current = null;
    micStreamRef.current = null;
    setWebcamPreviewStream(null);
  }, []);

  const clearPreviewUrl = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const resetRecording = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
    stopAllTracks();
    clearPreviewUrl();
    setVideoBlob(null);
    setElapsedMs(0);
    setErrorMessage(null);
    setPhase('idle');
    durationMsRef.current = 0;
    pausedAccumRef.current = 0;
    pauseStartedRef.current = null;
  }, [clearPreviewUrl, stopAllTracks]);

  const buildCombinedStream = useCallback(
    (display: MediaStream, webcam: MediaStream | null, mic: MediaStream | null) => {
      const combined = new MediaStream();
      for (const track of display.getVideoTracks()) combined.addTrack(track);
      for (const track of display.getAudioTracks()) combined.addTrack(track);
      if (webcam) {
        for (const track of webcam.getVideoTracks()) combined.addTrack(track);
        if (display.getAudioTracks().length === 0) {
          for (const track of webcam.getAudioTracks()) combined.addTrack(track);
        }
      }
      if (display.getAudioTracks().length === 0 && combined.getAudioTracks().length === 0 && mic) {
        for (const track of mic.getAudioTracks()) combined.addTrack(track);
      }
      return combined;
    },
    []
  );

  const finalizeBlob = useCallback(() => {
    const pausedExtra =
      pauseStartedRef.current != null ? Date.now() - pauseStartedRef.current : 0;
    durationMsRef.current = Math.max(
      0,
      Date.now() - startedAtRef.current - pausedAccumRef.current - pausedExtra
    );
    setElapsedMs(durationMsRef.current);

    const blob = new Blob(chunksRef.current, {
      type: mimeTypeRef.current.split(';')[0] || 'video/webm',
    });
    setVideoBlob(blob);
    clearPreviewUrl();
    setPreviewUrl(URL.createObjectURL(blob));
    setPhase('stopped');
    stopAllTracks();
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [clearPreviewUrl, stopAllTracks]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      finalizeBlob();
    }
  }, [finalizeBlob]);

  const startTimer = useCallback(() => {
    startedAtRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      const pausedExtra =
        pauseStartedRef.current != null ? Date.now() - pauseStartedRef.current : 0;
      const elapsed = Date.now() - startedAtRef.current - pausedAccumRef.current - pausedExtra;
      setElapsedMs(elapsed);
      if (elapsed >= MAX_DURATION_MS) {
        stopRecording();
      }
    }, 250);
  }, [stopRecording]);

  const startRecording = useCallback(
    async (recordingMode: RecordingMode) => {
      if (!isBugReportRecordingSupported()) {
        setErrorMessage('Screen recording is not supported in this browser.');
        setPhase('error');
        return;
      }

      resetRecording();
      setMode(recordingMode);
      setPhase('acquiring');

      try {
        const display = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        displayStreamRef.current = display;

        let webcam: MediaStream | null = null;
        let mic: MediaStream | null = null;
        if (recordingMode === 'screen_webcam') {
          webcam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          webcamStreamRef.current = webcam;
          setWebcamPreviewStream(webcam);
        } else {
          try {
            mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            micStreamRef.current = mic;
          } catch {
            setErrorMessage(
              'Microphone access was denied. The recording will have no audio and cannot be transcribed.'
            );
          }
        }

        display.getVideoTracks()[0]?.addEventListener('ended', () => {
          stopRecording();
        });

        const combined = buildCombinedStream(display, webcam, mic);
        if (combined.getAudioTracks().length === 0) {
          setErrorMessage(
            'No audio in this recording. Allow microphone access (or share tab audio) so the video can be transcribed.'
          );
        }
        mimeTypeRef.current = pickRecorderMimeType();
        const recorder = new MediaRecorder(combined, { mimeType: mimeTypeRef.current });
        recorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => finalizeBlob();
        recorder.onerror = () => {
          setErrorMessage('Recording failed.');
          setPhase('error');
          stopAllTracks();
        };

        recorder.start(1000);
        setPhase('recording');
        startTimer();
      } catch (err) {
        stopAllTracks();
        const msg = err instanceof Error ? err.message : 'Could not start recording';
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
          setErrorMessage('Screen sharing permission was denied.');
        } else {
          setErrorMessage(msg);
        }
        setPhase('error');
      }
    },
    [buildCombinedStream, finalizeBlob, resetRecording, startTimer, stopAllTracks, stopRecording]
  );

  const pauseRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recorder.pause();
    pauseStartedRef.current = Date.now();
    setPhase('paused');
  }, []);

  const resumeRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    if (pauseStartedRef.current != null) {
      pausedAccumRef.current += Date.now() - pauseStartedRef.current;
      pauseStartedRef.current = null;
    }
    recorder.resume();
    setPhase('recording');
  }, []);

  const removeVideo = useCallback(() => {
    resetRecording();
  }, [resetRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current);
      stopAllTracks();
      clearPreviewUrl();
    };
  }, [clearPreviewUrl, stopAllTracks]);

  const remainingMs = Math.max(0, MAX_DURATION_MS - elapsedMs);

  return {
    phase,
    mode,
    elapsedMs,
    elapsedLabel: formatTimer(elapsedMs),
    remainingMs,
    remainingLabel: formatTimer(remainingMs),
    maxDurationMs: MAX_DURATION_MS,
    videoBlob,
    previewUrl,
    webcamPreviewStream,
    errorMessage,
    durationMs: durationMsRef.current || elapsedMs,
    isActive: phase === 'recording' || phase === 'paused' || phase === 'acquiring',
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    removeVideo,
    resetRecording,
  };
}

export type BugReportRecorder = ReturnType<typeof useBugReportRecorder>;
