import { describe, it, expect } from 'vitest';
import { runAgent, checkWeight, PACKAGES, type Package } from './agent';

describe('checkWeight', () => {
  it('returns the real weight for a known package', () => {
    expect(checkWeight(PACKAGES, 'B')).toBe(47);
  });
  it('returns null for an unknown package id', () => {
    expect(checkWeight(PACKAGES, 'Z')).toBeNull();
  });
});

describe('runAgent', () => {
  it('finds the correct heaviest package, matching a plain reduce() max', () => {
    const trueMax = PACKAGES.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
    const steps = [...runAgent()];
    const final = steps.at(-1)!;
    expect(final.type).toBe('final');
    expect(final.text).toContain(trueMax.id);
    expect(final.text).toContain(String(trueMax.weightKg));
  });

  it('emits exactly one action + observation pair per package', () => {
    const steps = [...runAgent()];
    expect(steps.filter((s) => s.type === 'action')).toHaveLength(PACKAGES.length);
    expect(steps.filter((s) => s.type === 'observation')).toHaveLength(PACKAGES.length);
  });

  it('gets the right answer on a custom package set, including ties', () => {
    const tied: Package[] = [
      { id: 'X', weightKg: 10 },
      { id: 'Y', weightKg: 30 },
      { id: 'Z', weightKg: 30 },
    ];
    const final = [...runAgent(tied)].at(-1)!;
    // First package to reach the max wins ties, same as a stable reduce().
    expect(final.text).toContain('Y');
  });

  it('never observes a package it did not just act on', () => {
    const steps = [...runAgent()];
    for (let i = 0; i < steps.length - 1; i++) {
      if (steps[i].type === 'action') {
        expect(steps[i + 1].type).toBe('observation');
      }
    }
  });
});
