import { describe, it, expect } from 'vitest';
import { ARCH_PATTERNS, getArchPattern } from './arch-patterns';

describe('ARCH_PATTERNS', () => {
  it('has unique ids', () => {
    const ids = ARCH_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every pattern has all 4 non-empty angles', () => {
    for (const pattern of ARCH_PATTERNS) {
      expect(pattern.eli5.length).toBeGreaterThan(0);
      expect(pattern.pipelineFlow.length).toBeGreaterThan(0);
      expect(pattern.bestFor.length).toBeGreaterThan(0);
      expect(pattern.tradeoff.length).toBeGreaterThan(0);
    }
  });

  it('covers at least monolith, microservices, serverless, and jamstack', () => {
    const ids = ARCH_PATTERNS.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['monolith', 'microservices', 'serverless', 'jamstack']));
  });

  it('no two patterns share the exact same tradeoff text', () => {
    const tradeoffs = ARCH_PATTERNS.map((p) => p.tradeoff);
    expect(new Set(tradeoffs).size).toBe(tradeoffs.length);
  });
});

describe('getArchPattern', () => {
  it('finds a real pattern by id', () => {
    expect(getArchPattern('serverless')?.name).toBe('Serverless');
  });

  it('returns undefined for an unknown id', () => {
    expect(getArchPattern('nonexistent')).toBeUndefined();
  });
});
