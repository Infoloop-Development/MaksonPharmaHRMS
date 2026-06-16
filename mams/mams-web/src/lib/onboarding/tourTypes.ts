import type { Driver } from 'driver.js';

export type TourPopoverSide = 'top' | 'bottom' | 'left' | 'right';

export type TourPageApi = Record<string, (...args: unknown[]) => unknown>;

export type TourRuntimeContext = {
  driver: Driver;
  moveNext: () => void;
  movePrevious: () => void;
  refresh: () => void;
  waitForSelector: (tourId: string, timeoutMs?: number) => Promise<boolean>;
  pageApi: TourPageApi;
  advanceToPhase: (phaseId: string) => void;
  getCurrentStepId: () => string | null;
  isReplay: () => boolean;
};

export type TourStepDef = {
  id: string;
  title: string;
  description: string;
  side?: TourPopoverSide;
  /** When true, the highlighted control stays clickable (e.g. pencil to enter edit mode). Default: locked. */
  allowInteraction?: boolean;
  /** Skip step when false or anchor missing. */
  when?: () => boolean;
  onEnter?: (ctx: TourRuntimeContext) => void | Promise<void>;
  onLeaveForward?: (ctx: TourRuntimeContext) => void | Promise<void>;
  onLeaveBackward?: (ctx: TourRuntimeContext) => void | Promise<void>;
};

export type TourPhase = {
  id: string;
  steps: TourStepDef[];
  onExit?: (ctx: TourRuntimeContext) => void | Promise<void>;
};

export type TourScript = {
  phases: TourPhase[];
  onStart?: (ctx: TourRuntimeContext) => void | Promise<void>;
  onCleanup?: (ctx: TourRuntimeContext) => void | Promise<void>;
};

export type ResolvedTourStep = {
  phaseId: string;
  phaseIndex: number;
  stepIndexInPhase: number;
  def: TourStepDef;
};

export type TourHandle = {
  isActive: () => boolean;
  getCurrentStepId: () => string | null;
  onUserAction: (action: string) => void;
  advanceToPhase: (phaseId: string) => void;
  destroy: () => void;
};

/** Maps user actions (e.g. kpi-edit-opened) to phase ids. */
export type TourActionMap = Record<string, string>;
