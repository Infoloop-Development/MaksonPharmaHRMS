#!/usr/bin/env node
/**
 * One-shot POST through the local HTTP bridge (proves bridge → Render → MAMS works).
 *
 * Run while essl-http-bridge.js is running:
 *   node scripts/essl-test-bridge-post.js
 */
const BRIDGE = process.env.BRIDGE_URL || 'http://127.0.0.1:8080';
const SN = process.env.SIM_SN || 'TFDB244700544';
const BIO = process.env.SIM_BIO_IDS || '3';

function nowIst() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

async function main() {
  const ts = nowIst();
  const line = `${BIO}\t${ts}\t0\t1\t0\t0\t0`;
  const url = `${BRIDGE}/iclock/cdata?SN=${SN}&table=ATTLOG`;
  console.log(`POST ${url}`);
  console.log(`body: ${line}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: line,
  });
  const text = await res.text();
  console.log(`response: ${res.status} ${text.trim()}`);
  console.log('If OK → check Attendance Log for a new row at', ts);
}

main().catch((err) => {
  console.error('failed:', err.message);
  console.error('Is essl-http-bridge.js running on port 8080?');
  process.exit(1);
});
