import { useAuth } from '../store/auth';
import { DeviceManagementPanel } from '../components/devices/DeviceManagementPanel';

export function Devices() {
  const user = useAuth((s) => s.user);
  const canManage = user?.permissions.includes('manage.devices') ?? false;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Devices</h1>
          <div className="text-sm text-text-muted">
            Register and monitor eSSL and Hanvon biometric units. Use{' '}
            <strong className="font-semibold text-text">+ Register device</strong> below, then configure the server URL
            or push token on each physical unit.
          </div>
        </div>
      </div>

      <DeviceManagementPanel canManage={canManage} showSetupGuide showGoLivePanels showStats />
    </div>
  );
}
