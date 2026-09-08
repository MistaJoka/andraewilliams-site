import { describe, it, expect } from 'vitest';
import { naiveFill, engineeredFill } from './context';

describe('naiveFill (assembly-order, truncate on first miss)', () => {
  it('gets stuck at just the system prompt once the huge history item blocks it', () => {
    // This is the whole point of the demo: a low-relevance 8000-token item
    // sits second in assembly order, so truncation strands everything
    // after it even though smaller, more useful items would still fit.
    const r = naiveFill(4000);
    expect(r.included.map((i) => i.id)).toEqual(['system']);
    expect(r.used).toBe(400);
  });

  it('never exceeds the given budget', () => {
    for (const budget of [1500, 4000, 8000, 12000]) {
      expect(naiveFill(budget).used).toBeLessThanOrEqual(budget);
    }
  });
});

describe('engineeredFill (sorted by relevance, skip what does not fit)', () => {
  it('fills the same 4000-token budget far more productively than naive', () => {
    const r = engineeredFill(4000);
    expect(r.used).toBeGreaterThan(naiveFill(4000).used);
    expect(r.included.map((i) => i.id)).toContain('retrieved');
  });

  it('never exceeds the given budget', () => {
    for (const budget of [1500, 4000, 8000, 12000]) {
      expect(engineeredFill(budget).used).toBeLessThanOrEqual(budget);
    }
  });

  it('converges with naive once the budget is generous enough for almost everything', () => {
    const budget = 12000;
    const naive = naiveFill(budget).included.map((i) => i.id).sort();
    const eng = engineeredFill(budget).included.map((i) => i.id).sort();
    expect(eng).toEqual(naive);
  });
});
