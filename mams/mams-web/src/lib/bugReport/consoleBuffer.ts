export type ConsoleLevel = 'log' | 'warn' | 'error';

export interface ConsoleEntry {
  level: ConsoleLevel;
  message: string;
  ts: string;
}

const MAX = 100;
const MAX_MSG = 2000;
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

const buffer: ConsoleEntry[] = [];

function redactSecrets(text: string): string {
  return text.replace(JWT_RE, '[REDACTED_JWT]');
}

function stringifyArg(arg: unknown): string {
  if (arg == null) return String(arg);
  if (typeof arg === 'string') return redactSecrets(arg);
  if (arg instanceof Error) return redactSecrets(`${arg.name}: ${arg.message}`);
  try {
    return redactSecrets(JSON.stringify(arg));
  } catch {
    return redactSecrets(String(arg));
  }
}

function pushEntry(level: ConsoleLevel, args: unknown[]): void {
  const message = redactSecrets(args.map(stringifyArg).join(' ')).slice(0, MAX_MSG);
  buffer.push({ level, message, ts: new Date().toISOString() });
  while (buffer.length > MAX) buffer.shift();
}

export function getConsoleBufferSnapshot(): ConsoleEntry[] {
  return buffer.map((e) => ({ ...e }));
}

export function initConsoleBuffer(): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & { __mamsConsolePatched?: boolean };
  if (w.__mamsConsolePatched) return;
  w.__mamsConsolePatched = true;

  (['log', 'warn', 'error'] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      pushEntry(level, args);
      original(...args);
    };
  });
}
