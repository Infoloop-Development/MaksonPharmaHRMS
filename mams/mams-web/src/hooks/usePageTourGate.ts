import type { OnboardingTourId } from '@mams/types';
import { hasFirstLoginSession } from '../lib/onboarding/session';
import { useAuth } from '../store/auth';

export function useShouldAutoStartTour(tourId: OnboardingTourId) {
  const user = useAuth((s) => s.user);
  const tourCompleted = (user?.completedOnboardingTours ?? []).includes(tourId);
  return (
    Boolean(user) &&
    !user!.mustChangePassword &&
    !tourCompleted &&
    hasFirstLoginSession()
  );
}

/** @deprecated use useShouldAutoStartTour */
export function usePageTourGate(tourId: OnboardingTourId) {
  const shouldAutoStart = useShouldAutoStartTour(tourId);
  return { showWelcome: false, dismissWelcome: () => {}, shouldAutoStart };
}
