import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const message =
      err.issues.length > 0
        ? err.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ` : '') + i.message).join('; ')
        : 'Validation failed';
    res.status(400).json({ error: 'validation_failed', message, issues: err.issues });
    return;
  }
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.code, message: err.message, details: err.details });
    return;
  }
  logger.error('unhandled_error', { err: String(err), path: req.path });
  if (env.NODE_ENV === 'development' && err instanceof Error) {
    res.status(500).json({ error: 'internal_error', message: err.message, code: (err as NodeJS.ErrnoException).code });
    return;
  }
  res.status(500).json({ error: 'internal_error' });
}
