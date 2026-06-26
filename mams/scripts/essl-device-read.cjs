/**
 * Read users + attendance directly from eSSL/ZKTeco device on TCP 4370.
 * No eTimeTrackLite or old vendor software needed.
 *
 * One-time: npm install node-zklib
 * Run:     node scripts/essl-device-read.cjs
 *
 * Env:
 *   DEVICE_IP   (default 192.168.1.17)
 *   DEVICE_PORT (default 4370)
 *   COMM_KEY    (default 0 — set if device has Comm Key password)
 */
const ZKLib = require('node-zklib');

const IP = process.env.DEVICE_IP || '192.168.1.17';
const PORT = Number(process.env.DEVICE_PORT || 4370);
const COMM_KEY = Number(process.env.COMM_KEY || 0);

function fmtRecord(r) {
  const uid = r.deviceUserId ?? r.userId ?? r.uid ?? '?';
  const time = r.recordTime ?? r.attTime ?? r.timestamp ?? '?';
  return `  user=${uid}  time=${time}`;
}

async function main() {
  const zk = new ZKLib(IP, PORT, 15000, 4000, COMM_KEY, 'tcp');

  console.log(`Connecting to ${IP}:${PORT} (comm key ${COMM_KEY})...`);
  await zk.createSocket();

  const info = await zk.getInfo();
  console.log('\nDevice info:', info);

  const users = await zk.getUsers();
  const list = users.data ?? [];
  console.log(`\nUsers on device: ${list.length}`);
  for (const u of list.slice(0, 20)) {
    const id = u.userId ?? u.uid ?? u.userid ?? '?';
    const name = u.name ?? '';
    console.log(`  ID ${id}  ${name}`);
  }
  const user3 = list.find((u) => String(u.userId ?? u.uid) === '3');
  console.log(user3 ? '\nUser 3 found on device.' : '\nWARNING: User 3 NOT found — re-enroll on device.');

  console.log('\nDownloading attendance log (may take a few seconds)...');
  const logs = await zk.getAttendances((n, total) => {
    if (total) process.stdout.write(`\r  progress ${n}/${total}   `);
  });
  const rows = logs.data ?? [];
  console.log(`\n\nTotal attendance rows on device: ${rows.length}`);
  const last = rows.slice(-15);
  if (last.length === 0) {
    console.log('  (empty — device has never stored a punch, or log was cleared)');
  } else {
    console.log('Last records:');
    for (const r of last) console.log(fmtRecord(r));
  }

  await zk.disconnect();
  console.log('\nDone. Punch on device now and run this script again — last records should update.');
}

main().catch((err) => {
  console.error('\nFailed:', err.message || err);
  console.error('\nTips:');
  console.error('  - PC must be on same Wi-Fi as device');
  console.error('  - Close old vendor software if it locks the device (only one connection at a time)');
  console.error('  - If Comm Key is set on device, run: $env:COMM_KEY="12345"');
  process.exit(1);
});
