import { rgbToHex, parseHex, type Rgb } from './orgBrandingTheme';

function colorDistance(a: Rgb, b: Rgb): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

function isNeutral({ r, g, b }: Rgb): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 18) return true;
  if (max > 240 && min > 200) return true;
  if (max < 35) return true;
  return false;
}

function kMeans(pixels: Rgb[], k: number, iterations = 8): Rgb[] {
  if (pixels.length === 0) return [];
  const centroids: Rgb[] = [];
  for (let i = 0; i < k; i++) {
    centroids.push(pixels[Math.floor((i * pixels.length) / k)]!);
  }
  for (let iter = 0; iter < iterations; iter++) {
    const clusters: Rgb[][] = Array.from({ length: k }, () => []);
    for (const px of pixels) {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < k; i++) {
        const d = colorDistance(px, centroids[i]!);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      clusters[best]!.push(px);
    }
    for (let i = 0; i < k; i++) {
      const cluster = clusters[i]!;
      if (!cluster.length) continue;
      centroids[i] = {
        r: cluster.reduce((s, p) => s + p.r, 0) / cluster.length,
        g: cluster.reduce((s, p) => s + p.g, 0) / cluster.length,
        b: cluster.reduce((s, p) => s + p.b, 0) / cluster.length,
      };
    }
  }
  return centroids;
}

export function quantizePixelsToPalette(pixels: Rgb[], maxColors = 6): string[] {
  const filtered = pixels.filter((p) => !isNeutral(p));
  const sample = filtered.length > 2000 ? filtered.filter((_, i) => i % Math.ceil(filtered.length / 2000) === 0) : filtered;
  if (!sample.length) return [];
  const centroids = kMeans(sample, Math.min(maxColors, 6));
  const scored = centroids
    .map((c) => ({ hex: rgbToHex(c), count: sample.filter((p) => colorDistance(p, c) < 2500).length }))
    .sort((a, b) => b.count - a.count);
  const out: string[] = [];
  for (const { hex } of scored) {
    if (out.some((h) => colorDistance(parseHex(h), parseHex(hex)) < 1200)) continue;
    out.push(hex);
    if (out.length >= maxColors) break;
  }
  return out;
}

export function isSvgDataUrl(dataUrl: string | null | undefined): boolean {
  return Boolean(dataUrl?.startsWith('data:image/svg'));
}

export async function extractLogoPalette(dataUrl: string): Promise<string[]> {
  if (isSvgDataUrl(dataUrl)) return [];

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve([]);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const pixels: Rgb[] = [];
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3]! < 128) continue;
          pixels.push({ r: data[i]!, g: data[i + 1]!, b: data[i + 2]! });
        }
        resolve(quantizePixelsToPalette(pixels));
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = dataUrl;
  });
}
