import type { BugReportCreateBody } from '@mams/types';
import { bugReportsApi } from '../../api/bugReports';
import { uploadBugReportVideoXHR } from './uploadBugReportVideo';
import { uploadBugReportAttachmentsXHR } from './uploadBugReportAttachments';

export type SubmitBugReportProgress =
  | { stage: 'metadata'; percent: number }
  | { stage: 'attachments'; percent: number }
  | { stage: 'video'; percent: number };

/**
 * Submit: JSON metadata → optional attachments → optional video upload.
 */
export async function submitBugReport(
  payload: BugReportCreateBody,
  videoBlob: Blob | null | undefined,
  durationMs: number | undefined,
  attachmentFiles: File[] | undefined,
  onProgress?: (progress: SubmitBugReportProgress) => void
): Promise<string> {
  onProgress?.({ stage: 'metadata', percent: 0 });
  const { id } = await bugReportsApi.submit(payload);
  onProgress?.({ stage: 'metadata', percent: 100 });

  const files = attachmentFiles?.filter((f) => f.size > 0) ?? [];
  if (files.length > 0) {
    await uploadBugReportAttachmentsXHR(id, files, (percent) => {
      onProgress?.({ stage: 'attachments', percent });
    });
  }

  if (videoBlob && videoBlob.size > 0) {
    await uploadBugReportVideoXHR(id, videoBlob, durationMs, (percent) => {
      onProgress?.({ stage: 'video', percent });
    });
  }

  return id;
}
