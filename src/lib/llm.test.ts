import { describe, it, expect } from 'vitest';
import { CORPUS, corpusWords, buildBigram, predict, generateSteps } from './llm';

describe('buildBigram + predict on the real toy corpus', () => {
  const bigram = buildBigram(CORPUS);

  it('predicts "cat" and "dog" as the top candidates after "the"', () => {
    const top = predict(bigram, 'the', 2)!.map((c) => c.word);
    expect(top).toEqual(expect.arrayContaining(['cat', 'dog']));
  });

  it('predicts "by" as the dominant candidate after "cat sat"', () => {
    const top = predict(bigram, 'cat sat')!;
    expect(top[0].word).toBe('by');
  });

  it('returns null for a word never seen in the corpus', () => {
    expect(predict(bigram, 'xyzzy')).toBeNull();
  });

  it('percentages for a context sum to 100 (within floating-point tolerance)', () => {
    const all = predict(bigram, 'the', 999)!;
    const sum = all.reduce((acc, c) => acc + c.pct, 0);
    expect(sum).toBeCloseTo(100, 5);
  });
});

describe('corpusWords', () => {
  it('strips punctuation and lowercases', () => {
    expect(corpusWords('The Cat. sat!')).toEqual(['the', 'cat', 'sat']);
  });
});

describe('generateSteps', () => {
  // Small, hand-built bigram so generation is deterministic-ish and
  // easy to reason about, independent of the real toy corpus.
  const bigram = buildBigram('the cat sat on the mat the cat likes to nap');

  it('yields the seed first, then exactly one more word per step', () => {
    const steps = [...generateSteps(bigram, 'the cat', 3)];
    expect(steps[0]).toBe('the cat');
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].split(' ').length).toBe(steps[i - 1].split(' ').length + 1);
      expect(steps[i].startsWith(steps[i - 1])).toBe(true);
    }
  });

  it('stops generating (without erroring) once it hits an unknown word', () => {
    const steps = [...generateSteps(bigram, 'xyzzy', 5)];
    expect(steps).toEqual(['xyzzy']);
  });
});
