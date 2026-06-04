// Minimal structured logger. The team can swap for pino/winston later.
import { env } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';
const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[(env.LOG_LEVEL as Level) ?? 'info'] ?? 20;

function emit(level: Level, msg: string, ctx?: Record<string, unknown>) {
  if (LEVELS[level] < threshold) return;
  const entry = { ts: new Date().toISOString(), level, msg, ...ctx };
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](JSON.stringify(entry));
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => emit('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit('error', msg, ctx),
};
