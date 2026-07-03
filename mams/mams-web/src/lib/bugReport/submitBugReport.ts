import type { BugReportCreateBody } from '@mams/types';
import { bugReportsApi } from '../../api/bugReports';
import { uploadBugReportVideoXHR } from './uploadBugReportVideo';

export type SubmitBugReportProgress =
  | { stage: 'metadata'; percent: number }
  | { stage: 'video'; percent: number };

/**
 * Two-phase submit: JSON metadata first, then optional video upload with progress.
 */
export async function submitBugReport(
  payload: BugReportCreateBody,
  videoBlob: Blob | null | undefined,
  durationMs: number | undefined,
  onProgress?: (progress: SubmitBugReportProgress) => void
): Promise<string> {
  onProgress?.({ stage: 'metadata', percent: 0 });
  const { id } = await bugReportsApi.submit(payload);
  onProgress?.({ stage: 'metadata', percent: 100 });

  if (videoBlob && videoBlob.size > 0) {
    await uploadBugReportVideoXHR(id, videoBlob, durationMs, (percent) => {
      onProgress?.({ stage: 'video', percent });
    });
  }

  return id;
}
