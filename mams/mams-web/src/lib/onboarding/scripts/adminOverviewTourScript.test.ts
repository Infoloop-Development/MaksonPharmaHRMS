import { describe, it, expect } from 'vitest';
import {
  ADMIN_OVERVIEW_TOUR_ACTIONS,
  adminOverviewTourScript,
} from './adminOverviewTourScript';

describe('adminOverviewTourScript', () => {
  it('has unique phase ids', () => {
    const ids = adminOverviewTourScript.phases.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has at least one step per phase', () => {
    for (const phase of adminOverviewTourScript.phases) {
      expect(phase.steps.length).toBeGreaterThan(0);
    }
  });

  it('maps user actions to existing phases', () => {
    for (const phaseId of Object.values(ADMIN_OVERVIEW_TOUR_ACTIONS)) {
      expect(adminOverviewTourScript.phases.some((p) => p.id === phaseId)).toBe(true);
    }
  });

  it('defines cleanup handlers', () => {
    expect(adminOverviewTourScript.onCleanup).toBeTypeOf('function');
  });
});
