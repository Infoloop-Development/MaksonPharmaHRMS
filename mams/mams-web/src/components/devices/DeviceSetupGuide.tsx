import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDeviceIntegrationUrls } from './deviceIntegrationUrls';

export function DeviceSetupGuide() {
  const { iclockUrl, hanvonPushUrl } = useMemo(() => getDeviceIntegrationUrls(), []);

  return (
    <div className="rounded-md border border-border bg-surface2/40 p-4 text-sm space-y-3">
      <div className="font-semibold text-text">Integration setup</div>
      <p className="text-text-muted text-xs">
        Register each device here before connecting hardware. Saving the form only registers the device in MAMS —
        configure the physical unit on your network to start receiving punches.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-xs text-text-muted">
        <li>
          <span className="font-medium text-text">Employees first:</span> Load{' '}
          <Link to="/employees" className="text-primary hover:underline">
            Employees
          </Link>{' '}
          with Biometric ID matching device enrollment (before or after device setup).
        </li>
        <li>
          <span className="font-medium text-text">IT — enroll on hardware:</span> Fingerprint/face enrollment uses vendor
          software; use the same user ID as MAMS Biometric ID.
        </li>
        <li>
          <span className="font-medium text-text">eSSL (ADMS push):</span> Register serial number → on device set server
          URL to <code className="font-mono text-[11px] bg-surface2 px-1 rounded">{iclockUrl}</code> → confirm
          connection shows <strong>Live</strong> and punches appear in{' '}
          <Link to="/attendance" className="text-primary hover:underline">
            Attendance Log
          </Link>
          .
        </li>
        <li>
          <span className="font-medium text-text">Hanvon (push):</span> Register with push token → device POSTs JSON to{' '}
          <code className="font-mono text-[11px] bg-surface2 px-1 rounded">{hanvonPushUrl}</code> with headers{' '}
          <code className="font-mono">X-Device-Serial</code> and <code className="font-mono">X-Device-Token</code>.
        </li>
        <li>
          <span className="font-medium text-text">Hanvon (pull):</span> Set pull API base URL in the form → use{' '}
          <strong>Test</strong> then <strong>Sync Now</strong> in the table below.
        </li>
        <li>
          <span className="font-medium text-text">Pilot:</span> One test employee punches → verify Attendance Log + device{' '}
          <strong>Live</strong>. Check <strong>Unmapped punches</strong> below if attendance is missing.
        </li>
      </ol>
      <div className="rounded-md border border-border bg-surface2/50 p-3 text-xs text-text-muted">
        <strong className="text-text">Employee biometric IDs:</strong> When someone scans, the device sends a user ID.
        MAMS matches <code className="font-mono">Employee.biometricId</code> to that value. If no employee matches, the
        punch is <strong>not stored</strong> in attendance — only logged under <strong>Unmapped punches</strong> for HR
        to fix the Biometric ID and re-punch.
      </div>
      <p className="text-[11px] text-text-subtle">
        Local dev simulators: <code className="font-mono">node scripts/essl-sim.js</code> and{' '}
        <code className="font-mono">node scripts/hanvon-sim.js</code>
      </p>
    </div>
  );
}
