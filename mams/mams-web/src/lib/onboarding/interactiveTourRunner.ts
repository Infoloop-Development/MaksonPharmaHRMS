import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { DriveStep } from 'driver.js';
import { DRIVER_DEFAULTS } from './driverDefaults';
import {
  findTourElement,
  lockPageScroll,
  lockTourTarget,
  resolvePopoverSide,
  scrollTourElementIntoView,
  settleDom,
  tourElementExists,
  unlockAllTourTargets,
  unlockPageScroll,
  unlockTourTarget,
  waitForTourElement,
} from './tourDom';
import type {
  ResolvedTourStep,
  TourActionMap,
  TourPageApi,
  TourRuntimeContext,
  TourScript,
} from './tourTypes';

export type InteractiveRunner = {
  isActive: () => boolean;
  getCurrentStepId: () => string | null;
  onUserAction: (action: string) => void;
  advanceToPhase: (phaseId: string) => void;
  start: () => Promise<void>;
  destroy: () => void;
};

function flattenScript(script: TourScript): ResolvedTourStep[] {
  const out: ResolvedTourStep[] = [];
  script.phases.forEach((phase, phaseIndex) => {
    phase.steps.forEach((def, stepIndexInPhase) => {
      out.push({ phaseId: phase.id, phaseIndex, stepIndexInPhase, def });
    });
  });
  return out;
}

function resolveVisibleSteps(flat: ResolvedTourStep[]): ResolvedTourStep[] {
  return flat.filter(({ def }) => {
    if (def.when && !def.when()) return false;
    if (def.dynamic) return true;
    return tourElementExists(def.id);
  });
}

type RunnerOptions = {
  script: TourScript;
  getPageApi: () => TourPageApi;
  actionMap?: TourActionMap;
  replay: boolean;
  onComplete: () => void;
  onBeforeStart?: () => void;
};

export function createInteractiveTourRunner(options: RunnerOptions): InteractiveRunner {
  const { script, getPageApi, actionMap = {}, replay, onComplete, onBeforeStart } = options;
  const flat = flattenScript(script);
  let driverInst: ReturnType<typeof driver> | null = null;
  let active = false;
  let currentFlatIndex = 0;
  let visibleSteps: ResolvedTourStep[] = [];
  let completed = false;
  let navigating = false;
  let jumping = false;
  let highlightGen = 0;
  let finished = false;

  const getPhase = (phaseId: string) => script.phases.find((p) => p.id === phaseId);

  const buildCtx = (): TourRuntimeContext => ({
    driver: driverInst!,
    moveNext: () => {
      void driverInst?.moveNext();
    },
    movePrevious: () => {
      void driverInst?.movePrevious();
    },
    refresh: () => driverInst?.refresh(),
    waitForSelector: waitForTourElement,
    pageApi: getPageApi(),
    advanceToPhase: (phaseId: string) => {
      void jumpToPhase(phaseId);
    },
    getCurrentStepId: () => visibleSteps[currentFlatIndex]?.def.id ?? null,
    isReplay: () => replay,
  });

  const runPhaseExit = async (fromIndex: number, toIndex: number) => {
    if (toIndex <= fromIndex || fromIndex < 0) return;
    const fromPhase = visibleSteps[fromIndex]?.phaseId;
    const toPhase = visibleSteps[toIndex]?.phaseId;
    if (!fromPhase || fromPhase === toPhase) return;
    const phase = getPhase(fromPhase);
    if (phase?.onExit) await phase.onExit(buildCtx());
  };

  const finishTour = () => {
    if (finished) return;
    finished = true;
    if (!completed && !replay) {
      completed = true;
      onComplete();
    }
    destroy();
  };

  const destroy = () => {
    highlightGen += 1;
    unlockAllTourTargets();
    unlockPageScroll();
    if (driverInst) {
      driverInst.destroy();
      driverInst = null;
    }
    active = false;
    navigating = false;
    jumping = false;
  };

  const cleanupAll = async () => {
    if (!script.onCleanup) return;
    try {
      if (driverInst) await script.onCleanup(buildCtx());
      else await script.onCleanup({ ...buildCtx(), driver: driver({ steps: [] }) });
    } catch {
      /* ignore */
    }
  };

  const buildDriveSteps = (): DriveStep[] => {
    return visibleSteps.map((resolved, index) => {
      const { def } = resolved;
      return {
        element: () => findTourElement(def.id) ?? document.body,
        disableActiveInteraction: !(def.allowInteraction ?? false),
        popover: {
          title: def.title,
          description: def.description,
          side: resolvePopoverSide(def.side),
          align: 'start' as const,
          showButtons: ['next', 'previous', 'close'],
          onNextClick: (_el, _step, { driver: d }) => {
            if (navigating || jumping) return;
            navigating = true;
            void (async () => {
              try {
                if (def.onLeaveForward) {
                  await def.onLeaveForward(buildCtx());
                  await settleDom();
                }
                const nextIndex = index + 1;
                if (nextIndex < visibleSteps.length) {
                  await runPhaseExit(index, nextIndex);
                }
                if (finished) return;
                if (nextIndex >= visibleSteps.length) {
                  finishTour();
                } else {
                  currentFlatIndex = nextIndex;
                  await settleDom(80);
                  d.moveTo(nextIndex);
                }
              } finally {
                navigating = false;
              }
            })();
          },
          onPrevClick: (_el, _step, { driver: d }) => {
            if (navigating || jumping) return;
            navigating = true;
            void (async () => {
              try {
                if (def.onLeaveBackward) {
                  await def.onLeaveBackward(buildCtx());
                  await settleDom();
                }
                if (!finished) d.movePrevious();
              } finally {
                navigating = false;
              }
            })();
          },
        },
        onHighlightStarted: () => {
          const gen = ++highlightGen;
          currentFlatIndex = index;
          void (async () => {
            if (def.onEnter) {
              await def.onEnter(buildCtx());
              await settleDom();
            }
            if (gen !== highlightGen || finished) return;
            if (def.dynamic || !findTourElement(def.id)) {
              await waitForTourElement(def.id, 5000);
            }
            if (gen !== highlightGen || finished) return;
            scrollTourElementIntoView(def.id);
            await settleDom(40);
            if (gen !== highlightGen || finished) return;
            driverInst?.refresh();
            if (!(def.allowInteraction ?? false)) {
              lockTourTarget(def.id);
            }
            injectSkipButton();
          })();
        },
        onDeselected: () => {
          if (!(def.allowInteraction ?? false)) {
            unlockTourTarget(def.id);
          }
        },
      };
    });
  };

  const injectSkipButton = () => {
    const popovers = document.querySelectorAll('.driver-popover');
    const popover = popovers[popovers.length - 1];
    const footer = popover?.querySelector('.driver-popover-footer');
    if (!footer || footer.querySelector('.driver-popover-skip-btn')) return;
    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'driver-popover-skip-btn';
    skipBtn.textContent = 'Skip tour';
    skipBtn.addEventListener('click', finishTour);
    footer.insertBefore(skipBtn, footer.firstChild);
  };

  const syncSteps = () => {
    if (!driverInst) return;
    driverInst.setSteps(buildDriveSteps());
  };

  const moveToIndex = async (index: number) => {
    visibleSteps = resolveVisibleSteps(flat);
    if (visibleSteps.length === 0) return;
    currentFlatIndex = Math.min(Math.max(0, index), visibleSteps.length - 1);
    if (!driverInst) return;
    syncSteps();
    await settleDom(80);
    if (finished) return;
    driverInst.moveTo(currentFlatIndex);
  };

  const jumpToPhase = async (phaseId: string) => {
    if (jumping || navigating || finished) return;
    jumping = true;
    highlightGen += 1;
    try {
      visibleSteps = resolveVisibleSteps(flat);
      const idx = visibleSteps.findIndex((s) => s.phaseId === phaseId);
      if (idx < 0 || !driverInst) return;
      await runPhaseExit(currentFlatIndex, idx);
      await moveToIndex(idx);
    } finally {
      jumping = false;
    }
  };

  const start = async () => {
    finished = false;
    completed = false;
    onBeforeStart?.();
    await cleanupAll();
    visibleSteps = resolveVisibleSteps(flat);
    if (visibleSteps.length === 0) return;

    driverInst = driver({
      ...DRIVER_DEFAULTS,
      disableActiveInteraction: true,
      allowClose: true,
      onCloseClick: finishTour,
      onDestroyed: () => {
        void cleanupAll();
        driverInst = null;
        active = false;
      },
      steps: buildDriveSteps(),
    });

    active = true;
    lockPageScroll();
    if (script.onStart) await script.onStart(buildCtx());
    await settleDom(120);
    if (finished) return;
    driverInst.drive(0);
  };

  return {
    isActive: () => active,
    getCurrentStepId: () => visibleSteps[currentFlatIndex]?.def.id ?? null,
    onUserAction: (action: string) => {
      const phaseId = actionMap[action];
      if (phaseId) void jumpToPhase(phaseId);
    },
    advanceToPhase: (phaseId: string) => {
      void jumpToPhase(phaseId);
    },
    start,
    destroy: () => {
      void cleanupAll();
      destroy();
    },
  };
}
