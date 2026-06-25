#!/usr/bin/env node
/**
 * Local HTTP → HTTPS bridge for eSSL devices that cannot speak TLS to cloud hosts.
 *
 * Point the device at your PC (HTTPS OFF):
 *   Server Address: <your-pc-lan-ip>:8080
 *   Enable Domain Name: OFF
 *
 * Run (from mams/):
 *   node scripts/essl-http-bridge.js
 *
 * Env:
 *   BRIDGE_PORT  (default 8080)
 *   TARGET_HOST  (default mams-api-xvso.onrender.com)
 */
const http = require('http');
const https = require('https');

const PORT = Number(process.env.BRIDGE_PORT || 8080);
const TARGET = process.env.TARGET_HOST || 'mams-api-xvso.onrender.com';

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const path = req.url || '/';
    console.log(`[bridge] ${req.method} ${path} (${body.length} bytes)`);

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
        res.writeHead(pres.statusCode ?? 502, pres.headers);
        pres.pipe(res);
      }
    );

    upstream.on('error', (err) => {
      console.error('[bridge] upstream error:', err.message);
      res.statusCode = 502;
      res.end('Bad Gateway');
    });

    if (body.length) upstream.write(body);
    upstream.end();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[bridge] http://0.0.0.0:${PORT} -> https://${TARGET}`);
  console.log('[bridge] Windows firewall: allow inbound TCP', PORT);
});
