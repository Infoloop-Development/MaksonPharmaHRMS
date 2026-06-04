import express, { type Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import esslRouter from './routes/essl.routes.js';
import hanvonRouter from './routes/hanvon.routes.js';
import { errorHandler } from './middleware/error.js';
import { requestContext } from './middleware/requestContext.js';

export function buildApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet());
  const corsOrigins =
    env.NODE_ENV === 'development'
      ? Array.from(new Set([env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173']))
      : [env.CORS_ORIGIN];
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        cb(null, corsOrigins.includes(origin));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(requestContext);

  // Rate limit login. Default express-rate-limit keyGenerator uses req.ip, which is
  // often undefined behind Vite's dev proxy — that throws ERR_ERL_UNDEFINED_IP_ADDRESS (500).
  const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const raw = req.ip || req.socket?.remoteAddress || 'unknown';
      return String(raw).replace(/^::ffff:/, '');
    },
  });
  app.use('/api/auth/login', loginLimiter);

  // Health check (unauthenticated, useful for the load balancer / monitor).
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  // Public eSSL ADMS receiver - mounted at /iclock to match device expectations.
  // Devices on the local network are not authenticated; serial-number whitelist
  // in the receiver is the primary authn for this surface.
  app.use('/iclock', esslRouter);

  // Hanvon SDK push receiver (token auth per device).
  app.use('/integrations/hanvon', hanvonRouter);

  // Authenticated REST API.
  app.use('/api', apiRouter);

  app.use(errorHandler);

  return app;
}
