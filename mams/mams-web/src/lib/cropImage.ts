import { FAVICON_MAX_BYTES, FAVICON_OUTPUT_MAX_PX } from '@mams/types';

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function dataUrlByteLength(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.floor((base64.length * 3) / 4);
}

function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/**
 * Crop image to square PNG data URL, scaled to outputSize (max 512).
 */
export async function getCroppedImageDataUrl(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputSize = FAVICON_OUTPUT_MAX_PX
): Promise<{ dataUrl: string } | { error: string }> {
  const size = Math.min(FAVICON_OUTPUT_MAX_PX, Math.max(1, Math.round(outputSize)));
  const image = await loadImage(imageSrc);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { error: 'Could not create canvas context' };

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  let dataUrl = canvasToPngDataUrl(canvas);
  if (dataUrlByteLength(dataUrl) <= FAVICON_MAX_BYTES) {
    return { dataUrl };
  }

  // Retry at half resolution if PNG is too large
  const half = Math.max(32, Math.floor(size / 2));
  canvas.width = half;
  canvas.height = half;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    half,
    half
  );
  dataUrl = canvasToPngDataUrl(canvas);
  if (dataUrlByteLength(dataUrl) <= FAVICON_MAX_BYTES) {
    return { dataUrl };
  }

  return {
    error: 'Cropped favicon is too large (max 500 KB). Zoom out or use a simpler image.',
  };
}
