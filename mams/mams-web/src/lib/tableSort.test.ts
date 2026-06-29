import { describe, expect, it } from 'vitest';
import { DEFAULT_SORT_STATE, nextSortState } from './tableSort';

describe('nextSortState', () => {
  it('starts ascending when clicking a new column', () => {
    expect(nextSortState('name', DEFAULT_SORT_STATE)).toEqual({ col: 'name', dir: 'asc' });
    expect(nextSortState('name', { col: 'dept', dir: 'desc' })).toEqual({ col: 'name', dir: 'asc' });
  });

  it('toggles to descending on second click of same column', () => {
    expect(nextSortState('name', { col: 'name', dir: 'asc' })).toEqual({ col: 'name', dir: 'desc' });
  });

  it('resets to default on third click of same column', () => {
    expect(nextSortState('name', { col: 'name', dir: 'desc' })).toEqual(DEFAULT_SORT_STATE);
  });

  it('resets to a custom default (Employees)', () => {
    const employeesDefault = { col: 'empCode', dir: 'asc' as const };
    expect(nextSortState('name', { col: 'name', dir: 'desc' }, employeesDefault)).toEqual(employeesDefault);
  });

  it('cycles from custom default through asc and desc', () => {
    const employeesDefault = { col: 'empCode', dir: 'asc' as const };
    expect(nextSortState('empCode', employeesDefault, employeesDefault)).toEqual({
      col: 'empCode',
      dir: 'desc',
    });
    expect(
      nextSortState('empCode', { col: 'empCode', dir: 'desc' }, employeesDefault)
    ).toEqual(employeesDefault);
  });
});
