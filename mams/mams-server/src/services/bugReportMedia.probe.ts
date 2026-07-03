import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);

export function resolveFfprobePath(): string {
  const custom = process.env.FFPROBE_PATH?.trim();
  if (custom) return custom;

  const ffmpeg = env.FFMPEG_PATH;
  if (/ffmpeg(\.exe)?$/i.test(ffmpeg)) {
    return ffmpeg.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1');
  }
  return 'ffprobe';
}

/** Returns true when the file has at least one audio stream. */
export async function videoHasAudioStream(videoPath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      resolveFfprobePath(),
      [
        '-v',
        'error',
        '-select_streams',
        'a',
        '-show_entries',
        'stream=index',
        '-of',
        'csv=p=0',
        videoPath,
      ],
      { timeout: 30_000, maxBuffer: 1024 * 1024 }
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
