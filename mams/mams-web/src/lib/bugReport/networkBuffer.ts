export interface FailedRequestEntry {
  method: string;
  path: string;
  status: number;
  body?: string;
  ts: string;
}

const MAX = 50;
const MAX_BODY = 4000;
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

const buffer: FailedRequestEntry[] = [];

export function sanitizeNetworkBody(body: unknown): string | undefined {
  if (body == null) return undefined;
  let text: string;
  if (typeof body === 'string') {
    text = body;
  } else {
    try {
      text = JSON.stringify(body);
    } catch {
      text = String(body);
    }
  }
  text = text.replace(JWT_RE, '[REDACTED_JWT]');
  text = text.replace(/"Authorization"\s*:\s*"[^"]*"/gi, '"Authorization":"[REDACTED]"');
  text = text.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
  return text.slice(0, MAX_BODY);
}

export function recordFailedRequest(entry: Omit<FailedRequestEntry, 'ts' | 'body'> & { body?: unknown }): void {
  buffer.push({
    method: entry.method,
    path: entry.path,
    status: entry.status,
    body: sanitizeNetworkBody(entry.body),
    ts: new Date().toISOString(),
  });
  while (buffer.length > MAX) buffer.shift();
}

export function getFailedRequestsSnapshot(): FailedRequestEntry[] {
  return buffer.map((e) => ({ ...e }));
}
