import { ApiError } from '../middleware/error.js';

const ALLOWED_PUBLIC_VISITOR_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

function matchesMagicBytes(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 4) return false;
  if (mime === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8;
  if (mime === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (mime === 'image/gif') {
    return buffer.subarray(0, 3).toString('ascii') === 'GIF';
  }
  if (mime === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  if (mime === 'application/pdf') {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  return false;
}

export function validatePublicVisitorUploadFile(file: {
  mimetype: string;
  buffer: Buffer;
  originalname: string;
}): void {
  const mime = file.mimetype.toLowerCase().split(';')[0]?.trim() ?? '';
  if (!ALLOWED_PUBLIC_VISITOR_MIMES.has(mime)) {
    throw new ApiError(400, 'invalid_file_type', 'Only JPEG, PNG, GIF, WebP, and PDF files are allowed');
  }
  if (!matchesMagicBytes(file.buffer, mime)) {
    throw new ApiError(400, 'invalid_file_type', 'File content does not match its type');
  }
}
