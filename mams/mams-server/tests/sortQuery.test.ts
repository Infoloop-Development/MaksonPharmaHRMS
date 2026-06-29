import { describe, it, expect } from 'vitest';
import { parseSortQuery } from '../src/utils/sortQuery.js';

describe('parseSortQuery', () => {
  const map = { name: 'name', empCode: 'empCode' };

  it('returns default when sortBy missing', () => {
    expect(parseSortQuery(undefined, undefined, map, { empCode: 1 })).toEqual({ empCode: 1 });
  });

  it('returns default when sortBy not whitelisted', () => {
    expect(parseSortQuery('hack', 'asc', map, { empCode: 1 })).toEqual({ empCode: 1 });
  });

  it('maps asc and desc', () => {
    expect(parseSortQuery('name', 'asc', map)).toEqual({ name: 1 });
    expect(parseSortQuery('name', 'desc', map)).toEqual({ name: -1 });
  });
});
