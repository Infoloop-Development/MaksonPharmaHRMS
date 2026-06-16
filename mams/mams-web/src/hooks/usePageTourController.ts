import type { OnboardingTourId } from '@mams/types';
import type { UseInteractivePageTourOptions } from './useInteractivePageTour';
import { useInteractivePageTour } from './useInteractivePageTour';
import type { TourScript } from '../lib/onboarding/tourTypes';

export function usePageTourController(
  tourId: OnboardingTourId,
  script: TourScript,
  options: UseInteractivePageTourOptions = {}
) {
  const tour = useInteractivePageTour(tourId, script, options);
  return {
    tourRef: tour.tourRef,
    onReplayTour: tour.onReplayTour,
    shouldAutoStart: tour.shouldAutoStart,
  };
}
