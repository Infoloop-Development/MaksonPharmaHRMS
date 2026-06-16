import { useCallback, useEffect, useRef } from 'react';
import type { OnboardingTourId } from '@mams/types';
import { authApi } from '../api/auth';
import { createInteractiveTourRunner } from '../lib/onboarding/interactiveTourRunner';
import type { InteractiveRunner } from '../lib/onboarding/interactiveTourRunner';
import type { TourActionMap, TourPageApi, TourScript } from '../lib/onboarding/tourTypes';
import { useAuth } from '../store/auth';
import { useShouldAutoStartTour } from './usePageTourGate';

export type UseInteractivePageTourOptions = {
  pageApiRef?: React.MutableRefObject<TourPageApi>;
  actionMap?: TourActionMap;
  ready?: boolean;
  onBeforeStart?: () => void;
};

/** Prevents React Strict Mode double-mount from starting two drivers on one page. */
const autoStartedTourKeys = new Set<string>();

export function useInteractivePageTour(
  tourId: OnboardingTourId,
  script: TourScript,
  options: UseInteractivePageTourOptions = {}
) {
  const { pageApiRef, actionMap = {}, ready = true, onBeforeStart } = options;
  const setUser = useAuth((s) => s.setUser);
  const shouldAutoStart = useShouldAutoStartTour(tourId);
  const runnerRef = useRef<InteractiveRunner | null>(null);
  const tourRef = useRef<{
    onUserAction: (action: string) => void;
    getCurrentStepId: () => string | null;
    isActive: () => boolean;
    advanceToPhase: (phaseId: string) => void;
  } | null>(null);
  const completingRef = useRef(false);
  const markedCompleteRef = useRef(false);
  const autoStartKey = `${tourId}:${shouldAutoStart}`;

  const completeTour = useCallback(async () => {
    const completed = (useAuth.getState().user?.completedOnboardingTours ?? []).includes(tourId);
    if (completed || completingRef.current || markedCompleteRef.current) return;
    completingRef.current = true;
    try {
      const { user: updated } = await authApi.completeOnboardingTour(tourId);
      setUser(updated);
      markedCompleteRef.current = true;
    } catch {
      /* keep auto-start available if API fails */
    } finally {
      completingRef.current = false;
    }
  }, [setUser, tourId]);

  const destroyRunner = useCallback(() => {
    runnerRef.current?.destroy();
    runnerRef.current = null;
    tourRef.current = null;
  }, []);

  const getPageApi = useCallback((): TourPageApi => pageApiRef?.current ?? {}, [pageApiRef]);

  const startTour = useCallback(
    async (opts?: { replay?: boolean }) => {
      const replay = opts?.replay ?? false;
      destroyRunner();

      const runner = createInteractiveTourRunner({
        script,
        getPageApi,
        actionMap,
        replay,
        onBeforeStart,
        onComplete: () => {
          if (!replay) void completeTour();
        },
      });

      runnerRef.current = runner;
      tourRef.current = {
        onUserAction: (a) => runner.onUserAction(a),
        getCurrentStepId: () => runner.getCurrentStepId(),
        isActive: () => runner.isActive(),
        advanceToPhase: (p) => runner.advanceToPhase(p),
      };

      await runner.start();
    },
    [actionMap, completeTour, destroyRunner, getPageApi, onBeforeStart, script]
  );

  useEffect(() => {
    if (!ready || !shouldAutoStart) return;
    if (autoStartedTourKeys.has(autoStartKey)) return;
    autoStartedTourKeys.add(autoStartKey);

    const t = setTimeout(() => {
      void startTour();
    }, 300);
    return () => clearTimeout(t);
  }, [autoStartKey, ready, shouldAutoStart, startTour]);

  useEffect(() => () => destroyRunner(), [destroyRunner]);

  return {
    tourRef,
    isTourActive: () => runnerRef.current?.isActive() ?? false,
    startTour,
    onReplayTour: () => startTour({ replay: true }),
    shouldAutoStart,
  };
}
