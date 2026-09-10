// Pure logic behind /architecture/ -- three independent teaching models,
// each DOM-free so they're directly unit-testable (see architecture.test.ts)
// and importable by the page. They're three separate ideas, not three
// views of one model: (1) how much of a codebase a change actually
// touches under clean vs. tangled layering, (2) whether a set of
// AI-pipeline blocks forms a real request path, (3) scenario data for
// the architecture-tradeoff comparator.

// ---------------------------------------------------------------------
// 1. Blast radius: same task, clean layering vs. tangled layering.
// ---------------------------------------------------------------------

export type LayerId = 'ui' | 'api' | 'service' | 'data';

export interface Layer { id: LayerId; name: string; }

export const LAYERS: Layer[] = [
  { id: 'ui', name: 'UI / Client' },
  { id: 'api', name: 'API layer' },
  { id: 'service', name: 'Service / domain logic' },
  { id: 'data', name: 'Data / persistence' },
];

export type BoundaryQuality = 'clean' | 'tangled';

export interface Task {
  id: string;
  title: string;
  clean: LayerId[];
  tangled: LayerId[];
  note: string;
}

// Every task's `clean` and `tangled` set describes the same real-world
// change under two different codebases -- not a hypothetical, the kind
// of boundary violation that actually accretes in a codebase over time.
export const TASKS: Task[] = [
  {
    id: 'fix-discount-bug',
    title: 'Fix a bug in how order discounts are calculated',
    clean: ['service'],
    tangled: ['ui', 'api', 'service'],
    note: "Discount math that lives only in the service layer is a one-file fix. Copy-pasted into the UI too (for a live preview) and the API (for a quick sanity check), the same fix has to be found and repeated three times.",
  },
  {
    id: 'add-phone-field',
    title: 'Add a phone number field to user profiles',
    clean: ['ui', 'api', 'service', 'data'],
    tangled: ['ui', 'api', 'service', 'data'],
    note: "Genuinely cross-cutting either way -- a new field needs a form control, a contract change, validation, and a schema column. Clean boundaries don't shrink every task, just the ones that shouldn't have been wide.",
  },
  {
    id: 'rename-error-code',
    title: 'Rename an internal error code',
    clean: ['service'],
    tangled: ['ui', 'api', 'service'],
    note: "An error code mapped once at the service boundary is a one-file rename. Leaked as a raw string into UI display text and an API response check, renaming it means hunting down every place it leaked.",
  },
  {
    id: 'swap-database',
    title: 'Swap the database engine',
    clean: ['data'],
    tangled: ['ui', 'api', 'service', 'data'],
    note: "Queries that only ever go through a repository mean the database is a one-layer swap. Written as raw SQL directly in API handlers and a UI data hook too, swapping engines means finding every query, not just the ones behind the intended boundary.",
  },
];

export function getTask(taskId: string): Task {
  const task = TASKS.find((t) => t.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);
  return task;
}

export function getBlastRadius(taskId: string, quality: BoundaryQuality): { layers: LayerId[]; note: string } {
  const task = getTask(taskId);
  return { layers: quality === 'clean' ? task.clean : task.tangled, note: task.note };
}

// ---------------------------------------------------------------------
// 2. AI pipeline: does this set of blocks form a real request path?
// ---------------------------------------------------------------------

// Client and API are the fixed entry/exit of every request -- what's
// actually toggleable is what sits behind the API gateway.
export type ToggleBlockId = 'orchestrator' | 'retrieval' | 'llm' | 'tools';

export interface ToggleBlock { id: ToggleBlockId; name: string; whenToUse: string; }

export const TOGGLE_BLOCKS: ToggleBlock[] = [
  { id: 'orchestrator', name: 'Orchestrator', whenToUse: 'Add when anything downstream needs routing -- required before retrieval, an LLM, or tools can do anything.' },
  { id: 'retrieval', name: 'Retrieval / vector store', whenToUse: 'Add when the model needs facts it wasn\'t trained on -- your docs, your data, anything that changes after training.' },
  { id: 'llm', name: 'LLM', whenToUse: 'Add when the task needs judgment or language generation the model already knows how to do.' },
  { id: 'tools', name: 'Tools', whenToUse: 'Add when the model needs to do something, not just say something -- call an API, run code, change a record.' },
];

export type PipelineBlock = 'client' | 'api' | ToggleBlockId;
export interface PipelineLogEntry { block: PipelineBlock; text: string; }
export interface PipelineResult {
  valid: boolean;
  aiPowered: boolean;
  error?: string;
  log: PipelineLogEntry[];
}

export function runPipeline(enabled: Set<ToggleBlockId>): PipelineResult {
  const log: PipelineLogEntry[] = [];
  log.push({ block: 'client', text: 'Sends request' });
  log.push({ block: 'api', text: 'Forwards to the next layer' });

  if (!enabled.has('orchestrator')) {
    if (enabled.has('retrieval') || enabled.has('llm') || enabled.has('tools')) {
      const stranded = TOGGLE_BLOCKS.filter((b) => b.id !== 'orchestrator' && enabled.has(b.id)).map((b) => b.name);
      return {
        valid: false,
        aiPowered: false,
        error: `${stranded.join(' and ')} can't receive anything without an orchestrator to route requests to them.`,
        log,
      };
    }
    log.push({ block: 'api', text: 'No orchestrator wired up -- handled directly as a plain (non-AI) endpoint' });
    log.push({ block: 'client', text: 'Receives response' });
    return { valid: true, aiPowered: false, log };
  }

  if (!enabled.has('llm')) {
    return {
      valid: false,
      aiPowered: false,
      error: 'An orchestrator with no LLM has nothing to reason with -- this is an extra hop, not an AI pipeline yet.',
      log,
    };
  }

  log.push({ block: 'orchestrator', text: 'Receives request, decides what it needs' });

  if (enabled.has('retrieval')) {
    log.push({ block: 'orchestrator', text: 'Queries retrieval for relevant context' });
    log.push({ block: 'retrieval', text: 'Returns top-matching chunks' });
  }

  if (enabled.has('tools')) {
    log.push({ block: 'llm', text: 'Requests a tool call instead of answering yet' });
    log.push({ block: 'tools', text: 'Executes the call, returns a real result' });
    log.push({ block: 'llm', text: 'Uses the tool result to produce a final answer' });
  } else {
    log.push({ block: 'llm', text: enabled.has('retrieval') ? 'Generates a response grounded in the retrieved context' : 'Generates a response' });
  }

  log.push({ block: 'orchestrator', text: 'Returns the final answer' });
  log.push({ block: 'api', text: 'Returns response to client' });
  log.push({ block: 'client', text: 'Renders result' });

  return { valid: true, aiPowered: true, log };
}

// ---------------------------------------------------------------------
// 3. Compare: real scenarios, 2-3 architectural options each, real tradeoffs.
// ---------------------------------------------------------------------

export interface ArchOption {
  id: string;
  title: string;
  summary: string;
  pros: string[];
  cons: string[];
}

export interface Scenario {
  id: string;
  title: string;
  prompt: string;
  options: ArchOption[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'ai-code-review',
    title: 'Add AI-powered code review to CI',
    prompt: 'Every pull request should get an automated review comment from an LLM. Where does that call actually live?',
    options: [
      {
        id: 'in-process',
        title: 'In-process library call',
        summary: 'The CI script calls the LLM SDK directly, inline, as one more step.',
        pros: ['Simplest thing that could work', 'No new service to deploy or monitor', 'Fastest to ship'],
        cons: ['CI runtime now owns API keys and SDK version churn', 'Not reusable by any other tool', 'A slow LLM call blocks the whole CI job'],
      },
      {
        id: 'sidecar',
        title: 'Sidecar service',
        summary: 'A small internal HTTP service wraps the LLM call; CI just calls that service.',
        pros: ['Reusable by other tools and pipelines', 'API keys and rate-limiting live in one place', 'Can add caching centrally'],
        cons: ['Another service to deploy and keep alive', 'Adds a network hop and a new failure mode'],
      },
      {
        id: 'async-queue',
        title: 'Async queue',
        summary: 'CI enqueues a review request; a worker processes it and posts the result back later as a PR comment.',
        pros: ["CI job doesn't block waiting on the LLM", 'Naturally handles retries and backpressure', 'Review speed decoupled from CI speed'],
        cons: ['The review may land after the PR check already passed', 'Needs a queue, a worker, and a callback path -- more moving parts'],
      },
    ],
  },
  {
    id: 'agent-write-access',
    title: 'Let an AI agent make code changes directly in your repo',
    prompt: 'An agent can now generate and apply real diffs. How much can it do unsupervised?',
    options: [
      {
        id: 'direct-commit',
        title: 'Direct commit access',
        summary: 'The agent pushes straight to a branch, no human in the loop.',
        pros: ['Fastest possible feedback loop', 'No human bottleneck'],
        cons: ['A bad edit ships instantly', 'Hard to audit after the fact', 'Blast radius is whatever the agent touched, unchecked'],
      },
      {
        id: 'pr-gated',
        title: 'PR-only, human-gated',
        summary: 'The agent opens a pull request; CI runs, a human reviews and merges.',
        pros: ['Every change gets the same review a human change would', 'CI catches regressions before merge', 'A clean audit trail'],
        cons: ['Slower feedback loop', 'Still needs a human paying attention'],
      },
      {
        id: 'sandboxed-dry-run',
        title: 'Sandboxed dry-run',
        summary: "The agent's changes run in an isolated branch or environment first, promoted only if checks pass.",
        pros: ['Problems get caught before touching a real branch', 'Safe to let the agent be more autonomous over time'],
        cons: ['Needs real sandbox infrastructure', 'Still needs an explicit promotion gate'],
      },
    ],
  },
];

export function getScenario(scenarioId: string): Scenario {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);
  return scenario;
}
