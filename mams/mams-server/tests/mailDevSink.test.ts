import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getMailDevOutboxDir,
  writeWelcomeEmailToDevSink,
} from '../src/services/mailDevSink.service.js';

describe('mailDevSink', () => {
  afterEach(async () => {
    const dir = getMailDevOutboxDir();
    try {
      const files = await fs.readdir(dir);
      await Promise.all(files.map((f) => fs.unlink(path.join(dir, f))));
    } catch {
      // ignore
    }
  });

  it('writes html and txt files to the dev outbox', async () => {
    const htmlPath = await writeWelcomeEmailToDevSink({
      to: 'test@example.com',
      subject: 'Test subject',
      text: 'Plain body',
      html: '<p>HTML body</p>',
    });

    expect(htmlPath).toContain('mail-outbox');
    expect(htmlPath.endsWith('.html')).toBe(true);

    const html = await fs.readFile(htmlPath, 'utf8');
    const txt = await fs.readFile(htmlPath.replace(/\.html$/, '.txt'), 'utf8');

    expect(html).toContain('<p>HTML body</p>');
    expect(txt).toContain('test@example.com');
    expect(txt).toContain('Plain body');
  });
});
