import { useAuth } from '../../store/auth';
import { apiBasePath } from '../../api/apiBase';

export class BugReportUploadError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
  }
}

export function uploadBugReportAttachmentsXHR(
  reportId: string,
  files: File[],
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    for (const file of files) {
      form.append('files', file, file.name);
    }

    xhr.open('POST', `${apiBasePath()}/bug-reports/${encodeURIComponent(reportId)}/attachments`);
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

    xhr.onerror = () =>
      reject(new BugReportUploadError('Network error during file upload', 0, 'network_error'));
    xhr.send(form);
  });
}
