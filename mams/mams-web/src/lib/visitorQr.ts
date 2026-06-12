import QRCode from 'qrcode';

export async function generateQrDataUrl(url: string, size = 256): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
}

export async function downloadQrPng(url: string, filename: string): Promise<void> {
  const dataUrl = await generateQrDataUrl(url, 512);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function printQrCode(title: string, url: string, qrDataUrl: string): void {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)} — QR Code</title>
<style>
  body { font-family: system-ui, sans-serif; text-align: center; padding: 48px 24px; }
  h1 { font-size: 1.25rem; margin: 0 0 8px; }
  p { color: #555; font-size: 0.875rem; margin: 0 0 24px; word-break: break-all; }
  img { width: 280px; height: 280px; }
</style></head><body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(url)}</p>
  <img src="${qrDataUrl}" alt="QR code" />
  <script>window.onload = () => { window.print(); }</script>
</body></html>`;

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
