import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTBOX_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'mail-outbox');

function safeEmailSegment(email: string): string {
  return email.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
}

export function getMailDevOutboxDir(): string {
  return OUTBOX_DIR;
}

export async function writeWelcomeEmailToDevSink(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<string> {
  await fs.mkdir(OUTBOX_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${stamp}-${safeEmailSegment(params.to)}`;
  const htmlPath = path.join(OUTBOX_DIR, `${base}.html`);
  const txtPath = path.join(OUTBOX_DIR, `${base}.txt`);

  await Promise.all([
    fs.writeFile(htmlPath, params.html, 'utf8'),
    fs.writeFile(
      txtPath,
      [`To: ${params.to}`, `Subject: ${params.subject}`, '', params.text].join('\n'),
      'utf8'
    ),
  ]);

  return htmlPath;
}
