import QRCode from 'qrcode';

export type QrStickerBranding = {
  companyName: string;
  companyLogo: string | null;
  formTitle: string;
};

const PRINT_QR_SIZE = 280;
const DOWNLOAD_QR_SIZE = 400;
const CANVAS_PADDING = 32;
const CANVAS_LOGO_MAX_H = 80;

export async function generateQrDataUrl(url: string, size = 256): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildQrStickerHtml(qrDataUrl: string, branding: QrStickerBranding): string {
  const logoHtml = branding.companyLogo
    ? `<img class="logo" src="${escapeHtml(branding.companyLogo)}" alt="Company logo" />`
    : '';

  const brandRowHtml = branding.companyLogo
    ? `<div class="brand-row">
    ${logoHtml}
    <span class="brand-sep" aria-hidden="true"></span>
    <p class="company-name">${escapeHtml(branding.companyName)}</p>
  </div>`
    : `<p class="company-name company-name-only">${escapeHtml(branding.companyName)}</p>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(branding.formTitle)}: QR Code</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    text-align: center;
    padding: 48px 24px;
    color: #1a1f36;
    background: #fff;
  }
  .sticker {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    max-width: 360px;
  }
  .qr {
    width: ${PRINT_QR_SIZE}px;
    height: ${PRINT_QR_SIZE}px;
    display: block;
  }
  .brand-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    max-width: ${PRINT_QR_SIZE}px;
  }
  .brand-sep {
    width: 1px;
    align-self: stretch;
    min-height: 40px;
    background: #e2e6ed;
    flex-shrink: 0;
  }
  .company-name {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.35;
    margin: 0;
    text-align: left;
    flex: 1;
    min-width: 0;
  }
  .company-name-only {
    text-align: center;
  }
  .logo {
    max-height: 56px;
    max-width: 100px;
    object-fit: contain;
    display: block;
    flex-shrink: 0;
  }
  .form-title {
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.35;
    margin: 0;
  }
  @media print {
    body { padding: 24px; }
    .sticker { gap: 14px; }
  }
</style></head><body>
  <div class="sticker">
    ${brandRowHtml}
    <img class="qr" src="${qrDataUrl}" alt="QR code" />
    <p class="form-title">${escapeHtml(branding.formTitle)}</p>
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body></html>`;
}

export function printQrCode(qrDataUrl: string, branding: QrStickerBranding): void {
  const html = buildQrStickerHtml(qrDataUrl, branding);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => document.body.removeChild(iframe), 60_000);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function measureTextHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(/\s+/);
  let line = '';
  let lines = 1;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines += 1;
      line = word;
    } else {
      line = test;
    }
  }
  return lines * lineHeight;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(/\s+/);
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      cy += lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cy);
    cy += lineHeight;
  }
  return cy;
}

export async function renderQrStickerToDataUrl(
  qrDataUrl: string,
  branding: QrStickerBranding
): Promise<string> {
  const qrImg = await loadImage(qrDataUrl);
  let logoImg: HTMLImageElement | null = null;
  if (branding.companyLogo) {
    try {
      logoImg = await loadImage(branding.companyLogo);
    } catch {
      logoImg = null;
    }
  }

  const contentWidth = DOWNLOAD_QR_SIZE;
  const brandRowWidth = contentWidth;
  const logoSlotW = logoImg ? 100 : 0;
  const sepW = logoImg ? 12 : 0;
  const nameMaxWidth = brandRowWidth - logoSlotW - sepW;
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) throw new Error('Canvas not supported');

  measureCtx.font = '600 22px system-ui, sans-serif';
  const companyH = measureTextHeight(
    measureCtx,
    branding.companyName,
    Math.max(nameMaxWidth, brandRowWidth),
    28
  );
  measureCtx.font = '700 26px system-ui, sans-serif';
  const formH = measureTextHeight(measureCtx, branding.formTitle, contentWidth - CANVAS_PADDING * 2, 32);

  let logoH = 0;
  let logoW = 0;
  if (logoImg) {
    const scale = Math.min(1, CANVAS_LOGO_MAX_H / logoImg.height, 100 / logoImg.width);
    logoW = logoImg.width * scale;
    logoH = logoImg.height * scale;
  }

  const brandRowH = logoImg ? Math.max(logoH, companyH) : companyH;
  const gap = 16;
  const totalHeight =
    CANVAS_PADDING +
    brandRowH +
    gap +
    DOWNLOAD_QR_SIZE +
    gap +
    formH +
    CANVAS_PADDING;

  const canvas = document.createElement('canvas');
  canvas.width = contentWidth + CANVAS_PADDING * 2;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const contentLeft = CANVAS_PADDING;
  let y = CANVAS_PADDING;

  ctx.fillStyle = '#1a1f36';
  ctx.textAlign = 'left';

  if (logoImg) {
    const rowTop = y;
    const logoY = rowTop + (brandRowH - logoH) / 2;
    ctx.drawImage(logoImg, contentLeft, logoY, logoW, logoH);

    const sepX = contentLeft + logoW + 6;
    ctx.strokeStyle = '#e2e6ed';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sepX, rowTop + 4);
    ctx.lineTo(sepX, rowTop + brandRowH - 4);
    ctx.stroke();

    ctx.font = '600 22px system-ui, sans-serif';
    const nameX = sepX + 6;
    drawWrappedText(ctx, branding.companyName, nameX, rowTop + 22, nameMaxWidth - 6, 28);
    y += brandRowH;
  } else {
    ctx.textAlign = 'center';
    ctx.font = '600 22px system-ui, sans-serif';
    y = drawWrappedText(ctx, branding.companyName, centerX, y + 22, brandRowWidth, 28);
  }

  y += gap;
  ctx.drawImage(qrImg, centerX - DOWNLOAD_QR_SIZE / 2, y, DOWNLOAD_QR_SIZE, DOWNLOAD_QR_SIZE);
  y += DOWNLOAD_QR_SIZE + gap;

  ctx.textAlign = 'center';
  ctx.font = '700 26px system-ui, sans-serif';
  drawWrappedText(ctx, branding.formTitle, centerX, y + 26, contentWidth - CANVAS_PADDING * 2, 32);

  return canvas.toDataURL('image/png');
}

export async function downloadQrPng(
  publicUrl: string,
  branding: QrStickerBranding,
  filename: string
): Promise<void> {
  const qrDataUrl = await generateQrDataUrl(publicUrl, DOWNLOAD_QR_SIZE);
  const stickerDataUrl = await renderQrStickerToDataUrl(qrDataUrl, branding);
  const a = document.createElement('a');
  a.href = stickerDataUrl;
  a.download = filename;
  a.click();
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
