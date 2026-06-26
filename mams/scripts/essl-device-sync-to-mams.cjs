/**
 * Pull attendance from eSSL/ZKTeco device (TCP 4370) and POST to MAMS ADMS endpoint.
 * Use when device ADMS cloud push does not work (no eTimeTrackLite / vendor software needed).
 *
 * One-time: npm install node-zklib
 * Run:     node scripts/essl-device-sync-to-mams.cjs
 * Loop:    node scripts/essl-device-sync-to-mams.cjs --watch
 *
 * Env:
 *   DEVICE_IP, DEVICE_PORT, COMM_KEY
 *   MAMS_SERVER  (default https://mams-api-xvso.onrender.com)
 *   DEVICE_SN    (default TFDB244700544)
 */
const fs = require('fs');
const path = require('path');
const ZKLib = require('node-zklib');

const IP = process.env.DEVICE_IP || '192.168.1.17';
const PORT = Number(process.env.DEVICE_PORT || 4370);
const COMM_KEY = Number(process.env.COMM_KEY || 0);
const SERVER = (process.env.MAMS_SERVER || 'https://mams-api-xvso.onrender.com').replace(/\/$/, '');
const SN = process.env.DEVICE_SN || 'TFDB244700544';
const WATCH = process.argv.includes('--watch');
const INTERVAL = Number(process.env.SYNC_INTERVAL_MS || 60_000);
const STATE_FILE = path.join(__dirname, '.essl-sync-state.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { posted: {} };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function toIstString(d) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date(d)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

function recordKey(userId, istTs) {
  return `${userId}|${istTs}`;
}

function attLogLine(userId, istTs, status = 0) {
  return `${userId}\t${istTs}\t${status}\t1\t0\t0\t0`;
}

async function postBatch(lines) {
  if (lines.length === 0) return true;
  const url = `${SERVER}/iclock/cdata?SN=${encodeURIComponent(SN)}&table=ATTLOG`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: lines.join('\n'),
  });
  const text = await res.text();
  if (!res.ok || text.trim() !== 'OK') {
    throw new Error(`MAMS POST ${res.status}: ${text.trim()}`);
  }
  return true;
}

async function syncOnce() {
  const state = loadState();
  const zk = new ZKLib(IP, PORT, 20000, 4000, COMM_KEY, 'tcp');

  console.log(`[sync] device ${IP}:${PORT} -> ${SERVER} SN=${SN}`);
  await zk.createSocket();

  const info = await zk.getInfo();
  console.log(`[sync] device log count: ${info.logCounts ?? '?'}`);

  const logs = await zk.getAttendances();
  const rows = logs.data ?? [];
  const pending = [];

  for (const r of rows) {
    const userId = String(r.deviceUserId ?? r.userId ?? r.uid ?? '').trim();
    const rawTime = r.recordTime ?? r.attTime;
    if (!userId || !rawTime) continue;
    const istTs = toIstString(rawTime);
    const key = recordKey(userId, istTs);
    if (state.posted[key]) continue;
    const status = Number(r.status ?? r.state ?? 0);
    pending.push({ key, line: attLogLine(userId, istTs, status) });
  }

  console.log(`[sync] ${rows.length} on device, ${pending.length} new to upload`);

  const BATCH = 50;
  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH);
    await postBatch(chunk.map((p) => p.line));
    for (const p of chunk) state.posted[p.key] = new Date().toISOString();
    saveState(state);
    console.log(`[sync] uploaded ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
  }

  await zk.disconnect();
  console.log('[sync] done — check MAMS Attendance Log');
  return pending.length;
}

async function main() {
  do {
    try {
      await syncOnce();
    } catch (err) {
      console.error('[sync] error:', err.message || err);
    }
    if (!WATCH) break;
    console.log(`[sync] waiting ${INTERVAL}ms...`);
    await new Promise((r) => setTimeout(r, INTERVAL));
  } while (WATCH);
}

main();
