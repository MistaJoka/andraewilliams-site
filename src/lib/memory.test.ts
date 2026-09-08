import { describe, it, expect } from 'vitest';
import { salience, keywords, retrieve, SALIENCE_THRESHOLD, type MemoryEntry } from './memory';

describe('salience', () => {
  it('scores small talk as not worth remembering', () => {
    expect(salience("hey what's the weather like today")).toBeLessThan(SALIENCE_THRESHOLD);
  });

  it('scores a date-bearing fact as worth remembering', () => {
    expect(salience('my birthday is on March 3rd')).toBeGreaterThanOrEqual(SALIENCE_THRESHOLD);
  });

  it('scores an explicit "remember this" instruction as worth remembering', () => {
    expect(salience('I never want emails after 6pm, remember that')).toBeGreaterThanOrEqual(SALIENCE_THRESHOLD);
  });

  it('documents a known, intentional miss: a real preference scores just under threshold', () => {
    // This is the exact case called out in the page's own Failure Modes
    // block -- a genuine limitation of the keyword heuristic, not a bug.
    expect(salience('I prefer dark mode in every app I use')).toBeLessThan(SALIENCE_THRESHOLD);
  });
});

describe('keywords', () => {
  it('lowercases, strips punctuation, and drops stopwords', () => {
    expect(keywords("I'm allergic to Peanuts!")).toEqual(expect.arrayContaining(['allergic', 'peanuts']));
    expect(keywords('the a an is my to of and in on for it this that should')).toEqual([]);
  });
});

describe('retrieve', () => {
  const store: MemoryEntry[] = [
    { text: 'my birthday is on March 3rd', score: 4 },
    { text: 'I never want emails after 6pm, remember that', score: 5 },
    { text: "I'm allergic to peanuts, please remember for restaurant recs", score: 6 },
  ];

  it('finds a match by real keyword overlap', () => {
    expect(retrieve('when is the birthday', store)?.text).toContain('March 3rd');
    expect(retrieve('what time should emails stop', store)?.text).toContain('6pm');
  });

  it('returns null when nothing overlaps', () => {
    expect(retrieve('what is the capital of France', store)).toBeNull();
  });

  it('documents a known, intentional miss: a paraphrase with zero shared words fails to retrieve', () => {
    // The exact case the page's Failure Modes / Deep Dive sections use to
    // motivate embedding-based semantic search -- not a bug to "fix" here.
    expect(retrieve('what food should I avoid', store)).toBeNull();
  });
});
