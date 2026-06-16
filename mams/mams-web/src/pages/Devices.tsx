import { useAuth } from '../store/auth';
import { DeviceManagementPanel } from '../components/devices/DeviceManagementPanel';
import { usePageTourController } from '../hooks/usePageTourController';
import { GiveMeATourButton } from '../components/onboarding/GiveMeATourButton';
import { devicesTourScript } from '../lib/onboarding/scripts/devicesTourScript';

export function Devices() {
  const user = useAuth((s) => s.user);
  const canManage = user?.permissions.includes('manage.devices') ?? false;
  const tour = usePageTourController('devices', devicesTourScript, { ready: true });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3" data-tour-id="devices-header">
        <div>
          <h1 className="text-2xl font-bold">Devices</h1>
          <p className="text-sm text-text-muted hidden md:block">
            Register and monitor eSSL and Hanvon biometric units.
          </p>
          <p className="text-sm text-text-muted md:hidden">
            Register and monitor eSSL and Hanvon biometric units. Use{' '}
            <strong className="font-semibold text-text">+ Register</strong> below, then configure the server URL or push
            token on each unit.
          </p>
        </div>
        <GiveMeATourButton onClick={tour.onReplayTour} />
      </div>

      <DeviceManagementPanel canManage={canManage} showSetupGuide showGoLivePanels showStats />
    </div>
  );
}
