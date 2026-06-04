import { Link } from 'react-router-dom';

/** Explains biometric ID mapping for HR on Employees and import flows. */
export function BiometricIdBanner() {
  return (
    <div className="rounded-md border border-primary/20 bg-primary-bg p-4 text-sm mb-4">
      <div className="font-semibold text-text mb-1">Biometric ID = device user ID</div>
      <p className="text-xs text-text-muted leading-relaxed">
        Every employee who will punch on a biometric machine needs a <strong>Biometric ID</strong> in MAMS that
        matches the user ID enrolled on the hardware (not employee code). When someone scans a finger or face, the
        device sends that ID — MAMS links it to attendance only if an employee row exists with the same value.
      </p>
      <p className="text-xs text-text-muted mt-2">
        Agree the ID format with IT before go-live (e.g. <span className="font-mono">42</span> on device and{' '}
        <span className="font-mono">42</span> in MAMS, or <span className="font-mono">BIO042</span> in both).
        See the{' '}
        <Link to="/devices" className="text-primary font-semibold hover:underline">
          Devices
        </Link>{' '}
        page for go-live checklist and unmapped punch alerts.
      </p>
    </div>
  );
}
