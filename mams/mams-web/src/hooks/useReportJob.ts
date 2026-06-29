import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReportJobStatus, ReportJobStatusResponse } from '@mams/types';
import { complianceAttendanceApi } from '../api/complianceAttendance';
import { parseContentDispositionFilename } from '@mams/types';
import { apiBasePath } from '../api/apiBase';
import { useAuth } from '../store/auth';

const POLL_MS = 2000;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useReportJob() {
  const [job, setJob] = useState<ReportJobStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settleRef = useRef<{ resolve: () => void; reject: (e: Error) => void } | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const downloadJob = useCallback(async (jobId: string, fallbackFilename: string) => {
    const token = useAuth.getState().accessToken;
    const res = await fetch(`${apiBasePath()}/compliance-attendance/report-jobs/${jobId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error((payload as { message?: string }).message ?? `Download failed (${res.status})`);
    }
    const blob = await res.blob();
    const filename =
      parseContentDispositionFilename(res.headers.get('Content-Disposition')) ?? fallbackFilename;
    downloadBlob(blob, filename);
  }, []);

  const pollJob = useCallback(
    (jobId: string, fallbackFilename: string) => {
      stopPolling();
      setIsPolling(true);
      setError(null);

      const tick = async () => {
        try {
          const status = await complianceAttendanceApi.getReportJob(jobId);
          setJob(status);
          if (status.status === 'completed') {
            stopPolling();
            await downloadJob(jobId, fallbackFilename);
            settleRef.current?.resolve();
            settleRef.current = null;
          } else if (status.status === 'failed') {
            stopPolling();
            const message = status.errorMessage ?? 'Report generation failed';
            setError(message);
            settleRef.current?.reject(new Error(message));
            settleRef.current = null;
          }
        } catch (e) {
          stopPolling();
          const message = e instanceof Error ? e.message : 'Failed to check report status';
          setError(message);
          settleRef.current?.reject(new Error(message));
          settleRef.current = null;
        }
      };

      void tick();
      pollRef.current = setInterval(() => {
        void tick();
      }, POLL_MS);
    },
    [downloadJob, stopPolling]
  );

  const startJob = useCallback(
    (createFn: () => Promise<{ jobId: string }>, fallbackFilename: string): Promise<void> => {
      setJob(null);
      setError(null);
      return new Promise((resolve, reject) => {
        settleRef.current = { resolve, reject };
        void (async () => {
          try {
            const created = await createFn();
            pollJob(created.jobId, fallbackFilename);
          } catch (e) {
            settleRef.current = null;
            const message = e instanceof Error ? e.message : 'Failed to start report job';
            setError(message);
            reject(new Error(message));
          }
        })();
      });
    },
    [pollJob]
  );

  useEffect(
    () => () => {
      stopPolling();
      settleRef.current?.reject(new Error('Report cancelled'));
      settleRef.current = null;
    },
    [stopPolling]
  );

  const statusLabel = (status: ReportJobStatus | undefined): string => {
    if (!status) return '';
    if (status === 'queued') return 'Queued…';
    if (status === 'running') {
      if (job?.employeeCount && job.processedCount != null) {
        return `Generating… ${job.processedCount}/${job.employeeCount} employees`;
      }
      return 'Generating…';
    }
    if (status === 'completed') return 'Ready — downloading';
    if (status === 'failed') return 'Failed';
    return status;
  };

  return {
    job,
    isPolling,
    error,
    statusLabel: statusLabel(job?.status),
    startJob,
    stopPolling,
  };
}
