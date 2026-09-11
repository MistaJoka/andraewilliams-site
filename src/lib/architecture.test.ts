import { describe, it, expect } from 'vitest';
import {
  TASKS, SCENARIOS, APP_SHAPE_SCENARIOS,
  getBlastRadius, runPipeline, getScenario, getAppShapeScenario, buildPipelineSnippet,
  type ToggleBlockId, type Scenario,
} from './architecture';

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

describe('buildPipelineSnippet', () => {
  const set = (...ids: ToggleBlockId[]) => new Set(ids);

  it('with nothing enabled, shows a plain endpoint with no orchestrator', () => {
    const code = buildPipelineSnippet(set());
    expect(code).toContain('api.handle(req)');
    expect(code).not.toContain('orchestrator.run');
  });

  it('with orchestrator but no llm, shows the orchestrator call alone', () => {
    const code = buildPipelineSnippet(set('orchestrator'));
    expect(code).toContain('orchestrator.run(req)');
    expect(code).not.toContain('llm:');
  });

  it('with orchestrator + llm, includes the llm option but not retrieval/tools', () => {
    const code = buildPipelineSnippet(set('orchestrator', 'llm'));
    expect(code).toContain('llm: llmClient.generate');
    expect(code).not.toContain('retrieval:');
    expect(code).not.toContain('tools:');
  });

  it('adds retrieval and tools lines only when enabled', () => {
    const code = buildPipelineSnippet(set('orchestrator', 'llm', 'retrieval', 'tools'));
    expect(code).toContain('retrieval: vectorStore.query');
    expect(code).toContain('tools: [callApiTool, runCodeTool]');
  });
});

function checkScenarioIntegrity(scenarios: Scenario[]) {
  it('every scenario has 2-3 options', () => {
    for (const scenario of scenarios) {
      expect(scenario.options.length).toBeGreaterThanOrEqual(2);
      expect(scenario.options.length).toBeLessThanOrEqual(3);
    }
  });

  it('every option has at least one pro and one con', () => {
    for (const scenario of scenarios) {
      for (const option of scenario.options) {
        expect(option.pros.length).toBeGreaterThan(0);
        expect(option.cons.length).toBeGreaterThan(0);
      }
    }
  });

  it('every option has a path of at least 2 nodes', () => {
    for (const scenario of scenarios) {
      for (const option of scenario.options) {
        expect(option.path.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
}

describe('scenario data integrity', () => {
  checkScenarioIntegrity(SCENARIOS);

  it('getScenario throws for an unknown id', () => {
    expect(() => getScenario('nope')).toThrow();
  });
});

describe('app-shape scenario data integrity', () => {
  checkScenarioIntegrity(APP_SHAPE_SCENARIOS);

  it('getAppShapeScenario throws for an unknown id', () => {
    expect(() => getAppShapeScenario('nope')).toThrow();
  });
});
