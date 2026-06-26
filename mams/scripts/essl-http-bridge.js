#!/usr/bin/env node
/**
 * Local HTTP → HTTPS bridge for eSSL devices that cannot speak TLS to cloud hosts.
 *
 * Also patches ADMS responses so devices push ATTLOG (stamp=0 + DATA QUERY on getrequest).
 *
 * Device (HTTPS OFF): Server Address = <your-pc-lan-ip>:8080
 *
 * Run: node scripts/essl-http-bridge.js
 */
const http = require('http');
const https = require('https');

const PORT = Number(process.env.BRIDGE_PORT || 8080);
const TARGET = process.env.TARGET_HOST || 'mams-api-xvso.onrender.com';
const IST = 'Asia/Kolkata';

function istNowString() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

function istDaysAgoString(days) {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

function buildAttLogQueryCommand() {
  const cmdId = Date.now() % 100000;
  // Prefer 0/0 — many ZKTeco/eSSL units treat this as "upload all buffered ATTLOG".
  if (process.env.BRIDGE_QUERY_SIMPLE === '1') {
    return `C:${cmdId}:DATA QUERY ATTLOG\n`;
  }
  return `C:${cmdId}:DATA QUERY ATTLOG StartTime=0\tEndTime=0\n`;
}

function patchHandshake(body) {
  return String(body)
    .replace(/ATTLOGStamp=\d+/g, 'ATTLOGStamp=0')
    .replace(/OPERLOGStamp=\d+/g, 'OPERLOGStamp=0')
    .replace(/TransTimes=[^\n]+/g, 'TransTimes=00:00;23:59');
}

function proxyToUpstream(req, res, body, { patchHandshakeResponse = false } = {}) {
  const path = req.url || '/';
  const upstream = https.request(
    {
      hostname: TARGET,
      port: 443,
      path,
      method: req.method,
      headers: {
        ...req.headers,
        host: TARGET,
        'content-length': body.length,
      },
    },
    (pres) => {
      const chunks = [];
      pres.on('data', (c) => chunks.push(c));
      pres.on('end', () => {
        let out = Buffer.concat(chunks);
        if (patchHandshakeResponse && pres.statusCode === 200) {
          out = Buffer.from(patchHandshake(out.toString('utf8')), 'utf8');
        }
        res.writeHead(pres.statusCode ?? 502, pres.headers);
        res.end(out);
      });
    }
  );

  upstream.on('error', (err) => {
    console.error('[bridge] upstream error:', err.message);
    res.statusCode = 502;
    res.end('Bad Gateway');
  });

  if (body.length) upstream.write(body);
  upstream.end();
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const path = req.url || '/';
    console.log(`[bridge] ${req.method} ${path} (${body.length} bytes)`);
    if (req.method === 'POST' && body.length > 0) {
      console.log('[bridge] POST body preview:', body.toString('utf8').slice(0, 300));
    }

    if (req.method === 'GET' && path.startsWith('/iclock/getrequest')) {
      const cmd = buildAttLogQueryCommand();
      console.log('[bridge] -> DATA QUERY ATTLOG');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(cmd);
      return;
    }

    if (req.method === 'GET' && path.startsWith('/iclock/cdata')) {
      proxyToUpstream(req, res, body, { patchHandshakeResponse: true });
      return;
    }

    proxyToUpstream(req, res, body);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[bridge] http://0.0.0.0:${PORT} -> https://${TARGET}`);
  console.log('[bridge] Patches handshake (ATTLOGStamp=0) and answers getrequest with DATA QUERY');
  console.log('[bridge] Windows firewall: allow inbound TCP', PORT);
});
