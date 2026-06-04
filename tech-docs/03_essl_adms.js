const fs = require('fs');
const path = require('path');
const { Document, Packer } = require('docx');
const S = require('./_shared.js');

const doc = new Document({
  styles: S.styles, numbering: S.numbering,
  sections: [{
    properties: { page: S.PAGE },
    headers: { default: S.buildHeader('eSSL ADMS Protocol Cheat-sheet') },
    footers: { default: S.buildFooter() },
    children: [
      ...S.titleBlock('eSSL ADMS PROTOCOL CHEAT-SHEET', 'Push Data Technology - Device-to-Server Integration Reference'),

      S.kvTable([
        ['Document', 'eSSL ADMS Protocol Cheat-sheet'],
        ['Project', 'Makson Attendance Management System (MAMS)'],
        ['Audience', 'Backend developer responsible for biometric integration; QA testing device flows'],
        ['Tested device', 'eSSL SilkBio-101TC, SN TFDB244600829, IP 192.168.0.240'],
        ['Owner', 'Tech Lead, Infoloop Technologies LLP'],
        ['Version', 'v1 - 30 April 2026'],
      ]),
      S.spacer(280),

      S.mockupCallout(),
      S.spacer(280),

      S.h2('1. WHAT IS ADMS'),
      S.p('ADMS stands for Attendance Data Management Service - it is the device-to-server protocol used by eSSL biometric units to push attendance records to a remote endpoint. ADMS is HTTP-based: the device acts as the client and our server is the receiver. The device polls the server for commands and pushes attendance / log data on a configurable interval.'),
      S.p('Important nuance: ADMS is "push" from the device’s perspective, but the wire protocol is the device performing HTTP GET / POST against our server URL. We never initiate a connection to the device.'),

      S.h2('2. WHY ADMS (and not USB / SDK)'),
      S.dataTable(
        ['Approach', 'Pros', 'Cons', 'Verdict'],
        [
          ['ADMS push', 'Real-time; no polling; works through NAT; simple HTTP', 'Device firmware must support it; we own the receiver', 'CHOSEN'],
          ['Pull via SOAP / SDK', 'More feature-rich; bidirectional', 'Vendor SDK lock-in; complex; needs Windows tooling', 'Rejected'],
          ['USB sync', 'No network needed', 'Manual; not real-time; physical access required', 'Rejected'],
        ],
        [2200, 3500, 3500, 1180]
      ),

      S.h2('3. DEVICE-SIDE CONFIGURATION'),
      S.p('Configure each eSSL device (typically via the device’s admin menu or eSSL Software) with the following ADMS settings. Coordinate with Makson IT for device-side admin access.'),
      S.dataTable(
        ['Setting', 'Value', 'Notes'],
        [
          ['Server Mode', 'ADMS', 'On the device: Comm -> Cloud Server Setting -> Server Mode'],
          ['Server Address', 'mams.makson.local (or static IP)', 'Set this to the on-prem server hostname / IP reachable from the device subnet'],
          ['Server Port', '443', 'TLS preferred. Older firmware may require 80 - confirm with Makson IT'],
          ['Enable Domain Name', 'YES (if using hostname)', 'Otherwise NO and use IP'],
          ['Heartbeat / Periodic Time', '30 seconds', 'How often the device polls for commands'],
          ['Timing Send', '1 minute', 'How often the device pushes new logs'],
          ['Push to Server', 'Enabled', 'Enables the entire ADMS push stack on the device'],
          ['Encryption', 'OFF (Phase 1)', 'eSSL’s built-in encryption is proprietary; we rely on TLS at the transport layer'],
        ],
        [2700, 3580, 4080]
      ),

      S.h2('4. SERVER-SIDE ENDPOINTS TO IMPLEMENT'),
      S.p('eSSL devices expect specific URL paths. Implement these on mams-server. All endpoints respond with plain text (not JSON) - this is an ADMS quirk.'),

      S.h3('4.1 Device handshake / registration'),
      S.codeBlock(`GET /iclock/cdata?SN=<serial>&options=all&pushver=2.4.1&language=69

Response:
GET OPTION FROM: <serial>
ATTLOGStamp=9999
OPERLOGStamp=9999
ATTPHOTOStamp=None
ErrorDelay=30
Delay=30
TransTimes=00:00;14:05
TransInterval=1
TransFlag=TransData AttLog OpLog AttPhoto EnrollUser ChgUser EnrollFP ChgFP UserPic
TimeZone=8
Realtime=1
Encrypt=None
`),
      S.p('Response is text/plain. The device parses key=value pairs line-by-line. Replace TimeZone=8 only if the device firmware insists; for IST keep as 8 if eSSL convention requires (the device handles its own offset).'),

      S.h3('4.2 Attendance push (the important one)'),
      S.codeBlock(`POST /iclock/cdata?SN=<serial>&table=ATTLOG&Stamp=<stamp>

Body (text, tab-separated, one record per line):
<userId>\\t<timestamp>\\t<status>\\t<verifyType>\\t<workCode>\\t<reserved1>\\t<reserved2>

Example:
1234\\t2026-04-29 09:14:23\\t0\\t1\\t0\\t0\\t0
1235\\t2026-04-29 09:15:01\\t1\\t1\\t0\\t0\\t0

Where:
  userId       = device-side user ID (maps to employee.biometricId in MAMS)
  timestamp    = local time string YYYY-MM-DD HH:MM:SS (device timezone)
  status       = 0 = check-in, 1 = check-out, 2 = break-out, 3 = break-in,
                 4 = overtime-in, 5 = overtime-out
  verifyType   = 0 = password, 1 = fingerprint, 2 = card, 15 = face
  workCode     = optional; ignore in Phase 1
  reserved     = ignore

Server response (plain text, REQUIRED format):
OK
`),
      S.p('Response MUST be exactly "OK" (followed by newline) for the device to mark the records as delivered. Any other response causes the device to retry on its next push cycle. The server MUST persist the records before returning OK - returning OK without storing them causes data loss.'),

      S.h3('4.3 Operator log push (audit trail of device-side actions)'),
      S.codeBlock(`POST /iclock/cdata?SN=<serial>&table=OPERLOG&Stamp=<stamp>

Body: tab-separated; format varies by event type. Common types:
USER         <userId>\\t<name>\\t<privilege>\\t<password>\\t<card>\\t<group>
FP           <userId>\\t<fpIndex>\\t<flag>\\t<template>
ENROLL       <userId>\\t<type>\\t<status>

Server response: OK
`),
      S.p('In Phase 1 we receive these but only persist them to a low-priority log file - we do not surface them in the UI.'),

      S.h3('4.4 Command channel (server -> device)'),
      S.codeBlock(`The device polls:
GET /iclock/getrequest?SN=<serial>

Server responds with pending commands (or empty). Common commands:
C:<cmdId>:DATA QUERY ATTLOG StartTime=2026-04-29 00:00:00\\tEndTime=...
C:<cmdId>:CLEAR LOG          # clears device-side attendance buffer
C:<cmdId>:CHECK              # heartbeat
C:<cmdId>:REBOOT             # reboot device

When device executes a command, it POSTs:
POST /iclock/devicecmd?SN=<serial>
Body: <cmdId>\\t<resultCode>\\t<output>
`),
      S.p('In Phase 1 we use this only for the manual "Sync Now" device action - we enqueue a "DATA QUERY ATTLOG" for the last 24h to force the device to re-push any buffered records.'),

      S.h2('5. RECEIVING-SIDE PSEUDOCODE'),
      S.codeBlock(`// Express handler for the most important endpoint
app.post('/iclock/cdata', async (req, res) => {
  const { SN: serialNumber, table, Stamp } = req.query;

  // Look up the device once - cache it
  const device = await deviceCache.getBySerial(serialNumber);
  if (!device || !device.isActive) {
    return res.status(404).send('Device not registered');
  }

  if (table === 'ATTLOG') {
    const lines = req.body.toString().split('\\n').filter(Boolean);
    const records = lines.map(line => parseAttLogLine(line));

    // Resolve employees by biometricId in a single $in query
    const bioIds = [...new Set(records.map(r => r.userId))];
    const employees = await Employee.find({ biometricId: { $in: bioIds } }).lean();
    const empByBio = new Map(employees.map(e => [e.biometricId, e]));

    // Insert all raw punches in one batch - never modify, only insert
    const rawDocs = records
      .filter(r => empByBio.has(r.userId))
      .map(r => ({
        employeeId: empByBio.get(r.userId)._id,
        biometricId: r.userId,
        deviceId: device._id,
        punchType: r.status === 0 ? 'IN' : r.status === 1 ? 'OUT' : 'OTHER',
        rawTimestamp: parseDeviceTime(r.timestamp),  // -> UTC
        rawDate: formatIstDate(r.timestamp),         // 'YYYY-MM-DD'
        rawPayload: r,
        receivedAt: new Date(),
        sourceIp: req.ip,
      }));

    if (rawDocs.length > 0) {
      await AttendanceRaw.insertMany(rawDocs, { ordered: false });
      // Trigger Smart Anchor recompute for affected (employeeId, date) pairs
      await enqueueSmartAnchor(rawDocs);
    }

    // Update device last-ping
    await Device.updateOne(
      { _id: device._id },
      { $set: { lastPingAt: new Date() } }
    );
  }

  // Critical: respond exactly "OK" - device requires this
  res.set('Content-Type', 'text/plain');
  res.send('OK');
});`),

      S.h2('6. ERROR HANDLING'),
      S.bullet('Unknown serial number: return 404. Device will keep retrying. Add to a "pending registration" list visible in the Devices admin UI so an operator can approve.'),
      S.bullet('Malformed body line: skip the line, log it to /var/log/mams/essl-malformed.log, continue with the rest. Never reject the whole batch - that causes the device to keep retrying valid records.'),
      S.bullet('Unknown biometricId in payload: log to audit_log (eventType: orphan_punch), do NOT insert into attendance_raw. Surface in admin UI as "unmapped punches".'),
      S.bullet('Database error during INSERT: do NOT respond OK. Respond 500. The device will retry; the records remain in its 100K offline buffer.'),
      S.bullet('Slow Smart Anchor recompute: respond OK after raw INSERT, run Smart Anchor asynchronously. The raw record is the source of truth; the derived record can lag briefly.'),

      S.h2('7. TIMEZONE HANDLING'),
      S.p('eSSL devices send local time as a string YYYY-MM-DD HH:MM:SS without timezone metadata. The device is configured to display IST. Convert to UTC at ingestion using Asia/Kolkata as the source zone.'),
      S.codeBlock(`import { fromZonedTime } from 'date-fns-tz';

// Device sent: "2026-04-29 09:14:23"
// We know this is IST (Asia/Kolkata)
const istString = "2026-04-29 09:14:23";
const utcDate = fromZonedTime(istString, 'Asia/Kolkata');
// utcDate is a Date object representing the correct UTC instant
`),
      S.p('Always store rawTimestamp as a UTC Date. Always store rawDate as the IST calendar date string. Reports group by IST date, not UTC date.'),

      S.h2('8. TEST SETUP'),
      S.p('Use the test device documented in CLAUDE.md - eSSL SilkBio-101TC, serial TFDB244600829, IP 192.168.0.240. Verified compatible. For non-eSSL local development, use the device simulator described below.'),

      S.h3('8.1 Local device simulator'),
      S.p('Build a small Node script (essl-sim.js) that posts attendance batches to /iclock/cdata at a configurable interval. Useful for dev environments without a physical device.'),
      S.codeBlock(`// scripts/essl-sim.js
import fetch from 'node-fetch';

const SERVER = process.env.MAMS_SERVER || 'http://localhost:3001';
const SN = process.env.SIM_SN || 'SIM0000001';
const BIO_IDS = ['BIO001', 'BIO002', 'BIO003'];

async function pushOne() {
  const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const lines = BIO_IDS.map(b =>
    \`\${b}\\t\${ts}\\t0\\t1\\t0\\t0\\t0\`
  ).join('\\n');

  const r = await fetch(
    \`\${SERVER}/iclock/cdata?SN=\${SN}&table=ATTLOG&Stamp=9999\`,
    { method: 'POST', body: lines, headers: { 'Content-Type': 'text/plain' } }
  );
  console.log(await r.text());
}

setInterval(pushOne, 60_000);
pushOne();`),
      S.p('Register the simulator’s serial in the devices collection before running, otherwise pushes return 404.'),

      S.h2('9. KNOWN GOTCHAS'),
      S.bullet('Some eSSL firmware versions send Stamp=ALL on the registration request - parse it loosely.'),
      S.bullet('TLS with self-signed cert: older eSSL firmware fails TLS handshake on self-signed. Either install a Let’s Encrypt cert or set up the device to use HTTP and rely on local network isolation.'),
      S.bullet('Date format on some firmware variants is DD-MM-YYYY HH:MM:SS instead of YYYY-MM-DD HH:MM:SS. Detect and handle both.'),
      S.bullet('The device sends pushes line-by-line not as a JSON array. A single payload can contain dozens of records. Process all of them before returning OK.'),
      S.bullet('Device clock drift: if device clock is off by >5 min from server time, log a "clock_drift" alert. Drift >30 min should disable the device until corrected.'),
      S.bullet('100K offline buffer: if connectivity is lost, the device buffers up to ~100K records and floods them on reconnect. Make sure insertMany is fast enough to handle a 100K-row burst within a 60-second push window.'),

      S.h2('10. VALIDATION CHECKLIST FOR M2 (Device Connection Verified milestone)'),
      S.bullet('eSSL SilkBio-101TC at Surendranagar HQ pushes punches that arrive in attendance_raw within 60 seconds.'),
      S.bullet('Smart Anchor v2 generates a derived record for each (employee, date) pair within 5 seconds of raw insert.'),
      S.bullet('Live attendance log dashboard reflects new punches without manual refresh within 5 seconds.'),
      S.bullet('Device offline simulation: power off device, push records build up locally, on reconnect all records arrive without duplicates.'),
      S.bullet('Unknown biometricId path: orphan_punch logged in audit_log; surfaced in admin UI.'),
      S.bullet('Time zone correctness: device IST 09:14 -> rawTimestamp 03:44 UTC; rawDate "2026-04-29".'),
      S.bullet('Demo to Komal at Surendranagar; written acceptance recorded.'),

      S.h2('11. RELATED DOCUMENTS'),
      S.bullet('System Architecture Document - high-level architecture and the attendance push data flow.'),
      S.bullet('Database Schema Reference - attendance_raw, attendance_derived, devices schemas.'),
      S.bullet('Local Dev Setup Guide - how to run the device simulator.'),
      S.bullet('Approved mockup - https://makson-payroll-mockup.netlify.app'),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'tech', '03_eSSL_ADMS_Protocol_Cheatsheet.docx'), buf);
  console.log('eSSL ADMS Cheat-sheet created');
});
