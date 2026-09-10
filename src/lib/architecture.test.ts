import { describe, it, expect } from 'vitest';
import { TASKS, SCENARIOS, getBlastRadius, runPipeline, getScenario, type ToggleBlockId } from './architecture';

describe('getBlastRadius', () => {
  it('throws for an unknown task', () => {
    expect(() => getBlastRadius('nope', 'clean')).toThrow();
  });

  it('a duplicated-logic task has a smaller blast radius when cleanly layered', () => {
    const clean = getBlastRadius('fix-discount-bug', 'clean');
    const tangled = getBlastRadius('fix-discount-bug', 'tangled');
    expect(clean.layers).toEqual(['service']);
    expect(tangled.layers.length).toBeGreaterThan(clean.layers.length);
  });

  it('a genuinely cross-cutting task stays wide under both boundary qualities', () => {
    const clean = getBlastRadius('add-phone-field', 'clean');
    const tangled = getBlastRadius('add-phone-field', 'tangled');
    expect(clean.layers).toHaveLength(4);
    expect(tangled.layers).toHaveLength(4);
  });

  it('every task has a non-empty note explaining the contrast', () => {
    for (const task of TASKS) {
      expect(task.note.length).toBeGreaterThan(0);
    }
  });
});

describe('runPipeline', () => {
  const set = (...ids: ToggleBlockId[]) => new Set(ids);

  it('with nothing enabled, is a valid plain (non-AI) pipeline', () => {
    const r = runPipeline(set());
    expect(r.valid).toBe(true);
    expect(r.aiPowered).toBe(false);
    expect(r.log.some((l) => l.block === 'llm')).toBe(false);
  });

  it('retrieval with no orchestrator is invalid', () => {
    const r = runPipeline(set('retrieval'));
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/orchestrator/i);
  });

  it('tools with no orchestrator is invalid', () => {
    const r = runPipeline(set('tools'));
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/orchestrator/i);
  });

  it('orchestrator with no llm is invalid', () => {
    const r = runPipeline(set('orchestrator'));
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/llm/i);
  });

  it('orchestrator + llm is a valid, minimal AI pipeline', () => {
    const r = runPipeline(set('orchestrator', 'llm'));
    expect(r.valid).toBe(true);
    expect(r.aiPowered).toBe(true);
    expect(r.log.some((l) => l.block === 'retrieval')).toBe(false);
    expect(r.log.some((l) => l.block === 'tools')).toBe(false);
    expect(r.log.filter((l) => l.block === 'llm')).toHaveLength(1);
  });

  it('adding retrieval inserts a retrieval step before the llm call', () => {
    const r = runPipeline(set('orchestrator', 'llm', 'retrieval'));
    expect(r.valid).toBe(true);
    const retrievalIdx = r.log.findIndex((l) => l.block === 'retrieval');
    const llmIdx = r.log.findIndex((l) => l.block === 'llm');
    expect(retrievalIdx).toBeGreaterThan(-1);
    expect(retrievalIdx).toBeLessThan(llmIdx);
  });

  it('adding tools produces a second llm entry (final answer after the tool result)', () => {
    const r = runPipeline(set('orchestrator', 'llm', 'tools'));
    expect(r.valid).toBe(true);
    expect(r.log.filter((l) => l.block === 'llm')).toHaveLength(2);
    expect(r.log.some((l) => l.block === 'tools')).toBe(true);
  });

  it('every request starts at the client and ends at the client', () => {
    const r = runPipeline(set('orchestrator', 'llm', 'retrieval', 'tools'));
    expect(r.log[0].block).toBe('client');
    expect(r.log[r.log.length - 1].block).toBe('client');
  });
});

describe('scenario data integrity', () => {
  it('every scenario has 2-3 options', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.options.length).toBeGreaterThanOrEqual(2);
      expect(scenario.options.length).toBeLessThanOrEqual(3);
    }
  });

  it('every option has at least one pro and one con', () => {
    for (const scenario of SCENARIOS) {
      for (const option of scenario.options) {
        expect(option.pros.length).toBeGreaterThan(0);
        expect(option.cons.length).toBeGreaterThan(0);
      }
    }
  });

  it('getScenario throws for an unknown id', () => {
    expect(() => getScenario('nope')).toThrow();
  });
});
