import { useMemo } from 'react';
import type { DeviceCreate } from '../../api/devices';
import { Modal } from '../ui/Modal';
import { getDeviceIntegrationUrls } from './deviceIntegrationUrls';
import { CopyableField } from './CopyableField';

export function DevicePostRegisterModal({
  registered,
  onClose,
}: {
  registered: DeviceCreate;
  onClose: () => void;
}) {
  const urls = useMemo(() => getDeviceIntegrationUrls(), []);
  const vendor = registered.vendor ?? 'eSSL';
  const isHanvon = vendor === 'Hanvon';
  const isPull = registered.protocolMode === 'pull';

  return (
    <Modal
      open
      onClose={onClose}
      title="Device registered — next steps"
      size="md"
      footer={
        <button type="button" className="btn-primary" onClick={onClose}>
          Done — I will configure the device
        </button>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-text-muted text-xs">
          MAMS is ready to accept punches for <strong>{registered.name}</strong> (
          <span className="font-mono">{registered.deviceCode}</span>). Configure the physical device on your
          network using the details below. Attendance tracking starts automatically when punches arrive.
        </p>

        <CopyableField label="Serial number (must match device)" value={registered.serialNumber} />

        {vendor === 'eSSL' && (
          <>
            <CopyableField label="eSSL ADMS server URL" value={urls.iclockUrl} />
            <ol className="list-decimal list-inside text-xs text-text-muted space-y-1">
              <li>On the eSSL device menu, set the push/server URL to the value above.</li>
              <li>Confirm the device serial matches the serial number above.</li>
              <li>Ensure the device can reach the MAMS server on your factory network.</li>
            </ol>
          </>
        )}

        {isHanvon && !isPull && (
          <>
            <CopyableField label="Hanvon push URL" value={urls.hanvonPushUrl} />
            <CopyableField
              label="X-Device-Serial header"
              value={registered.serialNumber}
            />
            {registered.integrationConfig?.pushToken && (
              <CopyableField
                label="X-Device-Token header"
                value={registered.integrationConfig.pushToken}
              />
            )}
            <ol className="list-decimal list-inside text-xs text-text-muted space-y-1">
              <li>Configure the Hanvon device to POST attendance JSON to the push URL.</li>
              <li>Set headers X-Device-Serial and X-Device-Token to the values above.</li>
            </ol>
          </>
        )}

        {isHanvon && isPull && (
          <>
            {registered.integrationConfig?.pullBaseUrl && (
              <CopyableField label="Pull API base URL (on device)" value={registered.integrationConfig.pullBaseUrl} />
            )}
            <ol className="list-decimal list-inside text-xs text-text-muted space-y-1">
              <li>Confirm the device HTTP API is reachable from the MAMS server.</li>
              <li>Return to the device table and click <strong>Test</strong>, then <strong>Sync</strong>.</li>
            </ol>
          </>
        )}

        <div className="rounded-md border border-amber/30 bg-amber/5 p-3 text-xs text-text-muted">
          <strong className="text-text">Employees:</strong> Enroll each person on the device (IT/vendor software) using
          the same user ID as their <strong>Biometric ID</strong> in MAMS Employees. If the device sends an unknown ID,
          MAMS does not save attendance — check <strong>Unmapped punches</strong> on the Devices page, fix the
          employee record, then re-punch.
        </div>

        <p className="text-[11px] text-text-subtle">
          In the table below, connection will move from <strong>Pending setup</strong> →{' '}
          <strong>Waiting for first punch</strong> → <strong>Live</strong> as the device connects and sends data.
        </p>
      </div>
    </Modal>
  );
}
