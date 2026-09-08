import { describe, it, expect } from 'vitest';
import { COMMON_PASSWORDS, counts, charsetSize, formatDuration } from './password';

describe('counts', () => {
  it('classifies each character exactly once', () => {
    expect(counts('aA1!')).toEqual({ lower: 1, upper: 1, digit: 1, symbol: 1 });
  });
  it('returns all zeros for an empty string', () => {
    expect(counts('')).toEqual({ lower: 0, upper: 0, digit: 0, symbol: 0 });
  });
});

describe('charsetSize', () => {
  it('sums 26/26/10/33 for lower/upper/digit/symbol present', () => {
    expect(charsetSize({ lower: 1, upper: 1, digit: 1, symbol: 1 })).toBe(26 + 26 + 10 + 33);
  });
  it('never returns 0, even for no character classes', () => {
    expect(charsetSize({ lower: 0, upper: 0, digit: 0, symbol: 0 })).toBe(1);
  });
});

describe('formatDuration', () => {
  it('reports sub-1-second durations as instant', () => {
    expect(formatDuration(0.5)).toBe('instant');
  });
  it('reports invalid input as an em dash', () => {
    expect(formatDuration(-5)).toBe('—');
    expect(formatDuration(NaN)).toBe('—');
  });
  it('pluralizes correctly: exactly 1 is singular, everything else plural', () => {
    expect(formatDuration(1)).toBe('1.0 second');
    expect(formatDuration(1.3)).toBe('1.3 seconds');
    expect(formatDuration(10)).toBe('10 seconds');
  });
  it('uses irregular plurals correctly (centuries, not centurys)', () => {
    expect(formatDuration(3155760000 * 3.3)).toBe('3.3 centuries');
  });
  it('uses irregular plurals correctly (millennia, not millenniums)', () => {
    expect(formatDuration(31557600000 * 9)).toBe('9.0 millennia');
  });
  it('switches to exponential notation past a million units', () => {
    expect(formatDuration(31557600000 * 2e6)).toMatch(/^2\.0e\+6 millennia$/);
  });
});

describe('COMMON_PASSWORDS', () => {
  it('flags well-known leaked passwords', () => {
    expect(COMMON_PASSWORDS.has('123456')).toBe(true);
    expect(COMMON_PASSWORDS.has('password')).toBe(true);
  });
  it('does not flag a genuinely uncommon password', () => {
    expect(COMMON_PASSWORDS.has('xk7#mQ2!vLp9')).toBe(false);
  });
});
