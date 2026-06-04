#!/usr/bin/env node
/**
 * Hanvon SDK push simulator.
 * POSTs JSON punch batches to /integrations/hanvon/push
 *
 * Run: node scripts/hanvon-sim.js
 *
 * Env:
 *   MAMS_SERVER (default http://localhost:3001)
 *   HANVON_SN    (default HNV-F710-0001)
 *   HANVON_TOKEN (default hanvon-dev-token-change-me)
 *   SIM_BIO_IDS  (default BIO001,BIO002,BIO003)
 *   SIM_INTERVAL_MS (default 60000)
 */
const SERVER = process.env.MAMS_SERVER || 'http://localhost:3001';
const SN = process.env.HANVON_SN || 'HNV-F710-0001';
const TOKEN = process.env.HANVON_TOKEN || 'hanvon-dev-token-change-me';
const BIO_IDS = (process.env.SIM_BIO_IDS || 'BIO001,BIO002,BIO003').split(',');
const INTERVAL = Number(process.env.SIM_INTERVAL_MS || 60_000);

function nowIstString() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

async function pushBatch() {
  const ts = nowIstString();
  const records = BIO_IDS.filter(() => Math.random() < 0.6).map((userId) => ({
    userId,
    time: ts,
    inOut: Math.random() < 0.5 ? 0 : 1,
    verifyMode: 1,
  }));

  if (records.length === 0) {
    console.log(`[hanvon-sim] ${ts} - no punches this round`);
    return;
  }

  try {
    const res = await fetch(`${SERVER}/integrations/hanvon/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Serial': SN,
        'X-Device-Token': TOKEN,
      },
      body: JSON.stringify({ deviceSn: SN, records }),
    });
    const json = await res.json().catch(() => ({}));
    console.log(`[hanvon-sim] ${ts} - pushed ${records.length}, status=${res.status}`, json);
  } catch (err) {
    console.error(`[hanvon-sim] ${ts} - push failed:`, err.message);
  }
}

console.log(`[hanvon-sim] starting against ${SERVER}, SN=${SN}, every ${INTERVAL}ms`);
pushBatch();
setInterval(pushBatch, INTERVAL);
