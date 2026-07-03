import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import type { BugReportSeverity } from '@mams/types';
import { useAuth } from '../../store/auth';
import { captureViewportScreenshot, useBugReportRecorder } from '../../lib/bugReport';
import { BugReportModal } from './BugReportModal';
import { BugReportClickSpotlight } from './BugReportClickSpotlight';
import { useToast } from '../ui/Toast';

const HIDDEN_PREFIXES = ['/login', '/change-password', '/visit/'];

type FormState = {
  title: string;
  description: string;
  severity: BugReportSeverity;
};

type BugReportContextValue = {
  hidden: boolean;
  capturing: boolean;
  sessionOpen: boolean;
  modalVisible: boolean;
  isRecordingUi: boolean;
  form: FormState;
  setForm: (next: FormState) => void;
  recorder: ReturnType<typeof useBugReportRecorder>;
  onOpen: () => Promise<void>;
  onStopRecording: () => void;
};

const BugReportContext = createContext<BugReportContextValue | null>(null);

export function useBugReport() {
  const ctx = useContext(BugReportContext);
  if (!ctx) throw new Error('useBugReport must be used within BugReportProvider');
  return ctx;
}

export function BugReportProvider({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  const toast = useToast((s) => s.push);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    severity: 'medium',
  });

  const recorder = useBugReportRecorder();

  const hidden =
    !user ||
    HIDDEN_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(p));

  const modalVisible = sessionOpen && !recorder.isActive;
  const isRecordingUi = recorder.phase === 'recording' || recorder.phase === 'paused';

  useEffect(() => {
    if (recorder.phase !== 'stopped') return;
    if (recorder.durationMs >= recorder.maxDurationMs - 500) {
      toast('Recording stopped — 5 minute limit reached.', 'info');
    }
  }, [recorder.phase, recorder.durationMs, recorder.maxDurationMs, toast]);

  const closeSession = useCallback(() => {
    if (recorder.isActive) return;
    setSessionOpen(false);
    setScreenshot(null);
    recorder.removeVideo();
    setForm({ title: '', description: '', severity: 'medium' });
  }, [recorder]);

  const onOpen = useCallback(async () => {
    setCapturing(true);
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      const shot = await captureViewportScreenshot();
      setScreenshot(shot);
      setSessionOpen(true);
    } finally {
      setCapturing(false);
    }
  }, []);

  const onStopRecording = useCallback(() => {
    recorder.stopRecording();
    setSessionOpen(true);
  }, [recorder]);

  const value = useMemo(
    () => ({
      hidden,
      capturing,
      sessionOpen,
      modalVisible,
      isRecordingUi,
      form,
      setForm,
      recorder,
      onOpen,
      onStopRecording,
    }),
    [
      hidden,
      capturing,
      sessionOpen,
      modalVisible,
      isRecordingUi,
      form,
      recorder,
      onOpen,
      onStopRecording,
    ]
  );

  return (
    <BugReportContext.Provider value={value}>
      {children}

      {!hidden && (
        <>
          <BugReportModal
            sessionOpen={sessionOpen}
            visible={modalVisible}
            onCloseSession={closeSession}
            screenshotPreview={screenshot}
            recorder={recorder}
            form={form}
            onFormChange={setForm}
          />

          <BugReportClickSpotlight active={recorder.phase === 'recording'} />
        </>
      )}
    </BugReportContext.Provider>
  );
}
