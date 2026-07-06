#!/usr/bin/env node
/**
 * Download Vosk speech models for en, hi, gu into mams-server/vosk-models/.
 * Run from repo: npm run vosk:models
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '..');
const MODELS_ROOT = path.join(SERVER_ROOT, 'vosk-models');

const MODELS = [
  {
    lang: 'en',
    zipName: 'vosk-model-small-en-us-0.15.zip',
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip',
  },
  {
    lang: 'hi',
    zipName: 'vosk-model-hi-0.22.zip',
    url: 'https://alphacephei.com/vosk/models/vosk-model-hi-0.22.zip',
  },
  {
    lang: 'gu',
    zipName: 'vosk-model-gu-0.42.zip',
    url: 'https://alphacephei.com/vosk/models/vosk-model-gu-0.42.zip',
  },
];

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${url}: ${res.status}`);
  await pipeline(res.body, createWriteStream(dest));
}

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  if (process.platform === 'win32') {
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: 'inherit' }
    );
  } else {
    execFileSync('unzip', ['-o', zipPath, '-d', destDir], { stdio: 'inherit' });
  }
}

function findExtractedModelDir(langDir, zipBaseName) {
  const direct = path.join(langDir, zipBaseName.replace(/\.zip$/, ''));
  if (fs.existsSync(path.join(direct, 'am'))) return direct;
  const entries = fs.readdirSync(langDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const candidate = path.join(langDir, entry.name);
      if (fs.existsSync(path.join(candidate, 'am'))) return candidate;
    }
  }
  throw new Error(`Could not find extracted model in ${langDir}`);
}

async function main() {
  fs.mkdirSync(MODELS_ROOT, { recursive: true });
  const cacheDir = path.join(MODELS_ROOT, '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });

  for (const model of MODELS) {
    const langDir = path.join(MODELS_ROOT, model.lang);
    const marker = path.join(langDir, '.installed');
    if (fs.existsSync(marker)) {
      console.log(`[skip] ${model.lang} already installed`);
      continue;
    }

    console.log(`[download] ${model.lang} from ${model.url}`);
    const zipPath = path.join(cacheDir, model.zipName);
    if (!fs.existsSync(zipPath)) {
      await download(model.url, zipPath);
    }

    const extractTo = path.join(cacheDir, `extract-${model.lang}`);
    fs.rmSync(extractTo, { recursive: true, force: true });
    fs.mkdirSync(extractTo, { recursive: true });
    extractZip(zipPath, extractTo);

    const extracted = findExtractedModelDir(extractTo, model.zipName);
    fs.rmSync(langDir, { recursive: true, force: true });
    fs.mkdirSync(langDir, { recursive: true });

    const target = path.join(langDir, path.basename(extracted));
    fs.cpSync(extracted, target, { recursive: true });
    fs.rmSync(extractTo, { recursive: true, force: true });
    fs.writeFileSync(marker, new Date().toISOString());
    console.log(`[done] ${model.lang} -> ${target}`);
  }

  console.log('All Vosk models ready in', MODELS_ROOT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
