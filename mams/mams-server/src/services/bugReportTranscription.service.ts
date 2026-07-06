import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Types } from 'mongoose';
import type { BugReportDetail, BugReportDetectedLanguage } from '@mams/types';
import { env } from '../config/env.js';
import { ApiError } from '../middleware/error.js';
import { BugReportModel } from '../models/BugReport.js';
import {
  bugReportVideoExists,
  resolveBugReportVideoPath,
} from './bugReportMedia.storage.js';
import { videoHasAudioStream } from './bugReportMedia.probe.js';
import { getBugReportDetail } from './bugReporting.service.js';
import {
  canStartTranscription,
  isTranscriptionInProgress,
  pickBestTranscript,
  sanitizeTranscriptionError,
  shouldReturnCachedTranscription,
  type VoskTranscribeResponse,
} from './bugReportTranscription.helpers.js';

const execFileAsync = promisify(execFile);

const NO_AUDIO_MESSAGE =
  'This recording has no audio track. Re-record with your microphone enabled (allow mic access when prompted), or use Screen + webcam mode and speak while recording.';

async function extractAudioWav(videoPath: string, outputPath: string): Promise<void> {
  const timeoutMs = 120_000;
  try {
    await execFileAsync(
      env.FFMPEG_PATH,
      [
        '-y',
        '-i',
        videoPath,
        '-vn',
        '-map',
        '0:a:0',
        '-af',
        'highpass=f=80,volume=1.5',
        '-ar',
        '16000',
        '-ac',
        '1',
        '-c:a',
        'pcm_s16le',
        outputPath,
      ],
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (err) {
    const stderr =
      err && typeof err === 'object' && 'stderr' in err
        ? String((err as { stderr?: string }).stderr ?? '')
        : '';
    if (
      stderr.includes('does not contain any stream') ||
      stderr.includes('Stream map') ||
      stderr.includes('No output streams')
    ) {
      throw new Error(NO_AUDIO_MESSAGE);
    }
    throw err;
  }
}

export type TranscriptionLanguageHint = BugReportDetectedLanguage | 'auto';

async function callVoskService(
  wavPath: string,
  languageHint: TranscriptionLanguageHint = 'auto'
): Promise<VoskTranscribeResponse> {
  const buffer = await fs.readFile(wavPath);
  const form = new FormData();
  form.append('audio', new Blob([buffer], { type: 'audio/wav' }), 'audio.wav');
  if (languageHint !== 'auto') {
    form.append('language', languageHint);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.VOSK_TRANSCRIBE_TIMEOUT_MS);

  try {
    const res = await fetch(`${env.VOSK_SERVICE_URL.replace(/\/$/, '')}/transcribe`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const payload = (await res.json()) as { detail?: string };
        if (payload.detail) detail = payload.detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail || 'Vosk transcription service error');
    }

    return (await res.json()) as VoskTranscribeResponse;
  } finally {
    clearTimeout(timer);
  }
}

async function markTranscriptionFailed(reportId: string, message: string): Promise<BugReportDetail> {
  await BugReportModel.updateOne(
    { _id: reportId },
    {
      $set: {
        transcriptionStatus: 'failed',
        transcriptionError: sanitizeTranscriptionError(message),
      },
    }
  );
  return getBugReportDetail(reportId);
}

export async function transcribeBugReportVideo(
  reportId: string,
  options: { regenerate?: boolean; language?: TranscriptionLanguageHint } = {}
): Promise<BugReportDetail> {
  const regenerate = options.regenerate === true;
  const languageHint = options.language ?? 'auto';
  if (!Types.ObjectId.isValid(reportId)) {
    throw new ApiError(404, 'not_found', 'Bug report not found');
  }

  const doc = await BugReportModel.findById(reportId);
  if (!doc) throw new ApiError(404, 'not_found', 'Bug report not found');

  if (!doc.video?.filePath) {
    throw new ApiError(400, 'validation_error', 'This bug report has no screen recording');
  }

  if (!regenerate && shouldReturnCachedTranscription(doc.transcriptionStatus)) {
    return getBugReportDetail(reportId);
  }

  if (isTranscriptionInProgress(doc.transcriptionStatus)) {
    throw new ApiError(409, 'conflict', 'Transcription is already in progress');
  }

  if (!regenerate && !canStartTranscription(doc.transcriptionStatus)) {
    throw new ApiError(409, 'conflict', 'Transcription cannot be started for this report');
  }

  const videoExists = await bugReportVideoExists(doc.video.filePath);
  if (!videoExists) {
    throw new ApiError(
      404,
      'not_found',
      'Video file missing on disk. The recording may have been uploaded on another server (e.g. production) or removed after a redeploy. Submit a new bug report with video on this server to transcribe.'
    );
  }

  const videoPath = resolveBugReportVideoPath(doc.video.filePath);
  const hasAudio = await videoHasAudioStream(videoPath);
  if (!hasAudio) {
    return markTranscriptionFailed(reportId, NO_AUDIO_MESSAGE);
  }

  doc.transcriptionStatus = 'processing';
  doc.transcriptionError = null;
  if (regenerate) {
    doc.transcriptionText = null;
    doc.detectedLanguage = null;
    doc.transcriptionConfidence = null;
    doc.transcriptionGeneratedAt = null;
  }
  await doc.save();

  const tempDir = path.join(env.BUG_REPORT_TRANSCRIPTION_TEMP_DIR);
  await fs.mkdir(tempDir, { recursive: true });
  const wavPath = path.join(tempDir, `${reportId}-${Date.now()}.wav`);

  try {
    await extractAudioWav(videoPath, wavPath);
    const voskResult = await callVoskService(wavPath, languageHint);
    // Python service already scores all three models; re-ranking here caused short false Indic wins.
    const best =
      languageHint === 'auto'
        ? pickBestTranscript(voskResult)
        : {
            language: voskResult.best.language as BugReportDetectedLanguage,
            text: voskResult.best.text.trim(),
            confidence: voskResult.best.confidence,
          };

    if (!best.text) {
      return markTranscriptionFailed(
        reportId,
        'No speech detected in the recording. The video may be silent or too quiet.'
      );
    }

    doc.transcriptionText = best.text;
    doc.detectedLanguage = best.language;
    doc.transcriptionConfidence = best.confidence;
    doc.transcriptionStatus = 'completed';
    doc.transcriptionError = null;
    doc.transcriptionGeneratedAt = new Date();
    await doc.save();

    return getBugReportDetail(reportId);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message.includes('ENOENT') && err.message.includes('ffmpeg')
          ? 'ffmpeg not found. Install ffmpeg and set FFMPEG_PATH in mams-server/.env (or add ffmpeg to PATH), then restart the API server.'
          : err.message
        : 'Transcription failed. Check that ffmpeg and the Vosk service are running.';
    return markTranscriptionFailed(reportId, message);
  } finally {
    await fs.unlink(wavPath).catch(() => undefined);
  }
}
