import {
  FAVICON_MAX_BYTES,
  FAVICON_OUTPUT_MAX_PX,
  FAVICON_SOURCE_MAX_BYTES,
  LOGO_MAX_BYTES,
} from '@mams/types';

const LOGO_MIME = /^image\/(png|svg\+xml|jpeg|jpg)$/;
const FAVICON_RASTER_MIME = /^image\/(png|jpeg|jpg)$/;
const FAVICON_VECTOR_MIME = /^image\/(svg\+xml|x-icon|vnd\.microsoft\.icon)$/;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Invalid image file'));
    img.src = dataUrl;
  });
}

function dataUrlByteLength(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.floor((base64.length * 3) / 4);
}

export function isFaviconRasterMime(mime: string): boolean {
  return FAVICON_RASTER_MIME.test(mime);
}

export async function validateAndReadLogo(file: File): Promise<{ dataUrl: string } | { error: string }> {
  if (!LOGO_MIME.test(file.type)) {
    return { error: 'Logo must be PNG, SVG, or JPG format' };
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { error: `Logo file size must be under 500 KB. Current: ${(file.size / 1024).toFixed(0)} KB` };
  }

  const dataUrl = await readFileAsDataUrl(file);

  if (file.type === 'image/svg+xml') {
    return { dataUrl };
  }

  try {
    const { width, height } = await loadImageDimensions(dataUrl);
    if (width < 200 || height < 200) {
      return { error: `Logo too small. Minimum 200×200 px. Uploaded: ${width}×${height} px` };
    }
    if (width > 2000 || height > 2000) {
      return { error: `Logo too large. Maximum 2000×2000 px. Uploaded: ${width}×${height} px` };
    }
    return { dataUrl };
  } catch {
    return { error: 'Could not read logo image dimensions' };
  }
}

/** PNG/JPG source for favicon cropper: any aspect ratio, up to 5 MB. */
export async function validateFaviconSourceForCrop(
  file: File
): Promise<{ dataUrl: string } | { error: string }> {
  if (!FAVICON_RASTER_MIME.test(file.type)) {
    return { error: 'Use PNG or JPG for photo crop. SVG and ICO upload without cropping.' };
  }
  if (file.size > FAVICON_SOURCE_MAX_BYTES) {
    return {
      error: `Source image must be under ${(FAVICON_SOURCE_MAX_BYTES / (1024 * 1024)).toFixed(0)} MB. Current: ${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    };
  }
  const dataUrl = await readFileAsDataUrl(file);
  return { dataUrl };
}

/** SVG/ICO direct favicon upload (no cropper). */
export async function validateAndReadFavicon(file: File): Promise<{ dataUrl: string } | { error: string }> {
  if (!FAVICON_VECTOR_MIME.test(file.type)) {
    return { error: 'Direct upload supports SVG or ICO only. Use PNG/JPG for photo crop.' };
  }
  if (file.size > FAVICON_MAX_BYTES) {
    return { error: `Favicon must be under 500 KB. Current: ${(file.size / 1024).toFixed(0)} KB` };
  }
  const dataUrl = await readFileAsDataUrl(file);
  return { dataUrl };
}

/** Validate cropped favicon output before PATCH. */
export async function validateFaviconOutput(
  dataUrl: string
): Promise<{ dataUrl: string } | { error: string }> {
  if (!dataUrl.startsWith('data:image/png;base64,')) {
    return { error: 'Cropped favicon must be PNG' };
  }
  if (dataUrlByteLength(dataUrl) > FAVICON_MAX_BYTES) {
    return { error: 'Cropped favicon exceeds 500 KB. Zoom out or use a simpler image.' };
  }
  try {
    const { width, height } = await loadImageDimensions(dataUrl);
    if (width > FAVICON_OUTPUT_MAX_PX || height > FAVICON_OUTPUT_MAX_PX) {
      return { error: `Cropped favicon must be at most ${FAVICON_OUTPUT_MAX_PX}×${FAVICON_OUTPUT_MAX_PX} px` };
    }
    if (width !== height) {
      return { error: 'Cropped favicon must be square' };
    }
    return { dataUrl };
  } catch {
    return { error: 'Could not read cropped favicon' };
  }
}
