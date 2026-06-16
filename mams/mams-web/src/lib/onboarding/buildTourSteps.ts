import type { DriveStep } from 'driver.js';
import type { TourStepDef } from './tourTypes';

export function buildTourSteps(defs: TourStepDef[]): DriveStep[] {
  return defs
    .filter((def) => document.querySelector(`[data-tour-id="${def.id}"]`) !== null)
    .map((def) => ({
      element: `[data-tour-id="${def.id}"]`,
      popover: {
        title: def.title,
        description: def.description,
        side: def.side,
        align: 'start' as const,
      },
    }));
}
