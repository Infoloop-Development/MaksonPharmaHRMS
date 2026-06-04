import type { Request, Response, NextFunction } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      reqId?: string;
      clientIp?: string;
    }
  }
}

export function requestContext(req: Request, _res: Response, next: NextFunction): void {
  req.reqId = req.header('x-request-id') ?? Math.random().toString(36).slice(2, 10);
  // Derive client IP, respecting proxy headers if Express trust proxy is set.
  req.clientIp = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
  next();
}
