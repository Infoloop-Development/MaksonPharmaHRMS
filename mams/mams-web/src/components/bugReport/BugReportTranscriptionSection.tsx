import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BugReportDetail } from '@mams/types';
import { BUG_REPORT_DETECTED_LANGUAGE_LABELS } from '@mams/types';
import { adminBugReportingApi, BUG_REPORTING_QUERY_KEY } from '../../api/adminBugReporting';
import { useToast } from '../ui/Toast';

type LanguageHint = 'auto' | 'en' | 'hi' | 'gu';

type Props = {
  reportId: string;
  detail: Pick<
    BugReportDetail,
    | 'hasVideo'
    | 'videoAvailableOnDisk'
    | 'videoHasAudio'
    | 'transcriptionText'
    | 'detectedLanguage'
    | 'transcriptionStatus'
    | 'transcriptionError'
    | 'transcriptionConfidence'
  >;
};

export function BugReportTranscriptionSection({ reportId, detail }: Props) {
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const [languageHint, setLanguageHint] = useState<LanguageHint>('auto');

  const transcribeMu = useMutation({
    mutationFn: ({ regenerate }: { regenerate: boolean }) =>
      adminBugReportingApi.transcribe(reportId, { regenerate, language: languageHint }),
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: BUG_REPORTING_QUERY_KEY });
      if (updated.transcriptionStatus === 'completed') {
        toast('Transcription completed', 'success');
      } else if (updated.transcriptionStatus === 'failed') {
        toast(updated.transcriptionError ?? 'Transcription failed', 'error');
      }
    },
    onError: (e: unknown) => {
      toast(e instanceof Error ? e.message : 'Transcription failed', 'error');
    },
  });

  if (!detail.hasVideo) return null;

  if (!detail.videoAvailableOnDisk) {
    return (
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <h3 className="text-sm font-semibold text-text">Transcription</h3>
        <p className="text-sm text-amber">
          The screen recording file is not on this server (it may have been uploaded on production or
          lost after a redeploy). Video playback will also fail. Submit a new bug report with a
          recording while using this environment to transcribe.
        </p>
      </div>
    );
  }

  if (!detail.videoHasAudio) {
    return (
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <h3 className="text-sm font-semibold text-text">Transcription</h3>
        <p className="text-sm text-amber">
          This recording has no audio track, so it cannot be transcribed. Submit a new bug report,
          allow microphone access when prompted, and speak while recording your walkthrough.
        </p>
      </div>
    );
  }

  const isProcessing = detail.transcriptionStatus === 'processing' || transcribeMu.isPending;
  const isCompleted =
    !isProcessing &&
    detail.transcriptionStatus === 'completed' &&
    Boolean(detail.transcriptionText);
  const isFailed = detail.transcriptionStatus === 'failed';
  const canRequest = !isProcessing && !isCompleted && (detail.transcriptionStatus == null || isFailed);

  const languageLabel = detail.detectedLanguage
    ? BUG_REPORT_DETECTED_LANGUAGE_LABELS[detail.detectedLanguage]
    : null;

  const languageSelect = (
    <label className="flex items-center gap-2 text-xs text-text-muted">
      <span>Language</span>
      <select
        className="input input-sm min-h-[32px] py-1"
        value={languageHint}
        disabled={isProcessing}
        onChange={(e) => setLanguageHint(e.target.value as LanguageHint)}
      >
        <option value="auto">Auto-detect</option>
        <option value="en">English</option>
        <option value="hi">Hindi</option>
        <option value="gu">Gujarati</option>
      </select>
    </label>
  );

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text">Transcription</h3>
        <div className="flex flex-wrap items-center gap-2">
          {languageSelect}
          {canRequest && (
            <button
              type="button"
              className="btn-outline btn-sm min-h-[36px]"
              disabled={isProcessing}
              onClick={() => transcribeMu.mutate({ regenerate: false })}
            >
              {isFailed ? 'Retry transcription' : 'Get transcription'}
            </button>
          )}
          {isProcessing && (
            <button
              type="button"
              className="btn-outline btn-sm min-h-[36px] opacity-70 cursor-wait"
              disabled
            >
              Processing…
            </button>
          )}
          {isCompleted && !isProcessing && (
            <button
              type="button"
              className="btn-outline btn-sm min-h-[36px]"
              disabled={isProcessing}
              onClick={() => transcribeMu.mutate({ regenerate: true })}
            >
              Regenerate
            </button>
          )}
        </div>
      </div>

      {isCompleted && (
        <>
          <p className="text-xs text-text-muted">
          Detected language: {languageLabel ?? 'Unknown'}
          {detail.transcriptionConfidence != null && (
            <> · confidence {Math.round(detail.transcriptionConfidence * 100)}%</>
          )}
          {detail.transcriptionText && (
            <> · {detail.transcriptionText.trim().split(/\s+/).filter(Boolean).length} words</>
          )}
          . For Gujarati or Hindi recordings, choose that language in the dropdown and click
          Regenerate — auto-detect can miss long speech.
        </p>
          <div className="rounded-md border border-border bg-surface2/60 p-3 text-sm whitespace-pre-wrap text-text">
            {detail.transcriptionText}
          </div>
        </>
      )}

      {isFailed && !isProcessing && (
        <p className="text-sm text-red">
          {detail.transcriptionError ?? 'Transcription failed. You can retry.'}
        </p>
      )}

      {!isCompleted && !isFailed && !isProcessing && detail.transcriptionStatus == null && (
        <p className="text-xs text-text-muted">
          Choose the spoken language above, then generate a transcript. Longer recordings are split
          into 5-second chunks and may take 1–2 minutes. Auto-detect works best for English.
        </p>
      )}
    </div>
  );
}
