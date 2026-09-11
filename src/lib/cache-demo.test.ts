import { describe, it, expect, beforeEach } from 'vitest';
import { runCachedQuery, resetCacheDemo } from './cache-demo';

describe('runCachedQuery', () => {
  beforeEach(() => resetCacheDemo());

  it('misses on the first request for a query, and reaches the database', () => {
    const r = runCachedQuery('user:2');
    expect(r.hit).toBe(false);
    expect(r.steps.some((s) => s.includes('MISS'))).toBe(true);
    expect(r.steps.some((s) => s.includes('database'))).toBe(true);
  });

  it('hits on the second request for the same query, and never actually reaches the database', () => {
    runCachedQuery('user:2');
    const r = runCachedQuery('user:2');
    expect(r.hit).toBe(true);
    expect(r.steps.some((s) => s.includes('HIT'))).toBe(true);
    expect(r.steps.some((s) => s.includes('runs the real query'))).toBe(false);
    expect(r.steps).toHaveLength(2);
  });

  it('misses for a different query even after another one was cached', () => {
    runCachedQuery('user:2');
    const r = runCachedQuery('user:5');
    expect(r.hit).toBe(false);
  });

  it('resetCacheDemo clears state so a previously-cached query misses again', () => {
    runCachedQuery('user:2');
    resetCacheDemo();
    const r = runCachedQuery('user:2');
    expect(r.hit).toBe(false);
  });
});
