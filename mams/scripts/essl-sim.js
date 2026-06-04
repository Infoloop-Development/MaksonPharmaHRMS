#!/usr/bin/env node
/**
 * Tiny eSSL ADMS simulator.
 * Posts a batch of fake punches to /iclock/cdata every minute.
 *
 * Run: node scripts/essl-sim.js
 *
 * Env:
 *   MAMS_SERVER (default http://localhost:3001)
 *   SIM_SN      (default SIM0000001 - the dev simulator device seeded at npm run seed)
 *   SIM_BIO_IDS (default BIO001,BIO002,BIO003,BIO004,BIO005)
 *   SIM_INTERVAL_MS (default 60000)
 */
const SERVER = process.env.MAMS_SERVER || 'http://localhost:3001';
const SN = process.env.SIM_SN || 'SIM0000001';
const BIO_IDS = (process.env.SIM_BIO_IDS || 'BIO001,BIO002,BIO003,BIO004,BIO005').split(',');
const INTERVAL = Number(process.env.SIM_INTERVAL_MS || 60_000);

function nowIstString() {
  // 'YYYY-MM-DD HH:MM:SS' in IST
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

async function pushBatch() {
  const ts = nowIstString();
  // Random subset of bio IDs. Status 0 = check-in, 1 = check-out.
  const lines = BIO_IDS
    .filter(() => Math.random() < 0.6)
    .map((bio) => {
      const status = Math.random() < 0.5 ? 0 : 1;
      return `${bio}\t${ts}\t${status}\t1\t0\t0\t0`;
    });

  if (lines.length === 0) {
    console.log(`[essl-sim] ${ts} - no punches this round`);
    return;
  }

  try {
    const res = await fetch(`${SERVER}/iclock/cdata?SN=${SN}&table=ATTLOG&Stamp=9999`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: lines.join('\n'),
    });
    const text = await res.text();
    console.log(`[essl-sim] ${ts} - pushed ${lines.length} punches, server: "${text.trim()}"`);
  } catch (err) {
    console.error(`[essl-sim] ${ts} - push failed:`, err.message);
  }
}

console.log(`[essl-sim] starting against ${SERVER}, SN=${SN}, every ${INTERVAL}ms`);
pushBatch();
setInterval(pushBatch, INTERVAL);
