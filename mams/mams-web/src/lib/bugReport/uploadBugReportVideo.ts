import { useAuth } from '../../store/auth';
import { apiBasePath } from '../../api/apiBase';

function normalizeUploadBlob(blob: Blob): { blob: Blob; filename: string } {
  const baseType = blob.type.split(';')[0]?.trim().toLowerCase() || 'video/webm';
  const isMp4 = baseType === 'video/mp4';
  const normalizedType = isMp4 ? 'video/mp4' : 'video/webm';
  const filename = `recording.${isMp4 ? 'mp4' : 'webm'}`;
  if (blob.type === normalizedType) {
    return { blob, filename };
  }
  return { blob: new Blob([blob], { type: normalizedType }), filename };
}
export class BugReportUploadError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
  }
}

/**
 * Upload bug report video via XHR for upload.onprogress support.
 * tus resumable upload can replace this function in a follow-up.
 */
export function uploadBugReportVideoXHR(
  reportId: string,
  blob: Blob,
  durationMs: number | undefined,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    const { blob: uploadBlob, filename } = normalizeUploadBlob(blob);
    form.append('video', uploadBlob, filename);
    if (durationMs != null && Number.isFinite(durationMs)) {
      form.append('durationMs', String(Math.round(durationMs)));
    }

    xhr.open('POST', `${apiBasePath()}/bug-reports/${encodeURIComponent(reportId)}/video`);
    const token = useAuth.getState().accessToken;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || e.total <= 0) return;
      onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let message = xhr.statusText || 'Upload failed';
      let code = 'upload_error';
      try {
        const payload = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        if (payload.message) message = payload.message;
        if (payload.error) code = payload.error;
      } catch {
        /* ignore */
      }
      reject(new BugReportUploadError(message, xhr.status, code));
    };

    xhr.onerror = () => reject(new BugReportUploadError('Network error during video upload', 0, 'network_error'));
    xhr.send(form);
  });
}
