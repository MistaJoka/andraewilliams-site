import { describe, it, expect, beforeEach } from 'vitest';
import { submitBackgroundJob, resetJobCounter } from './job-queue';

describe('submitBackgroundJob', () => {
  beforeEach(() => resetJobCounter());

  it('returns an immediate response distinct from the background work', () => {
    const r = submitBackgroundJob('resize 500 images');
    expect(r.immediateResponse).toContain('202');
    expect(r.immediateResponse).not.toContain('resize 500 images');
  });

  it('gives the job 3 background steps, all referencing the same job id', () => {
    const r = submitBackgroundJob('resize 500 images');
    expect(r.backgroundSteps).toHaveLength(3);
    expect(r.backgroundSteps.every((s) => s.includes(`#${r.jobId}`))).toBe(true);
  });

  it('includes the actual task text in the background steps, not the immediate response', () => {
    const r = submitBackgroundJob('send newsletter');
    expect(r.backgroundSteps.some((s) => s.includes('send newsletter'))).toBe(true);
  });

  it('increments the job id on each successive submission', () => {
    const r1 = submitBackgroundJob('task A');
    const r2 = submitBackgroundJob('task B');
    expect(r2.jobId).toBe(r1.jobId + 1);
  });

  it('resetJobCounter starts numbering over from 1', () => {
    submitBackgroundJob('task A');
    submitBackgroundJob('task B');
    resetJobCounter();
    const r = submitBackgroundJob('task C');
    expect(r.jobId).toBe(1);
  });
});
