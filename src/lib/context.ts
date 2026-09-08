// Pure logic behind /context-engineering/ -- no DOM, so it's directly
// unit-testable (see context.test.ts) and importable by the page.

export interface ContextItem { id: string; label: string; tokens: number; relevance: number; }

// Order here is the order a naive "just append everything" assembly would
// use in practice: system prompt first, then "the conversation so far"
// (often huge), then whatever else was lying around.
export const CONTEXT_ITEMS: ContextItem[] = [
  { id: 'system', label: 'System prompt (identity + rules)', tokens: 400, relevance: 10 },
  { id: 'old-history', label: 'Full conversation history (50 turns)', tokens: 8000, relevance: 3 },
  { id: 'boilerplate', label: 'Repeated boilerplate instructions', tokens: 300, relevance: 2 },
  { id: 'tools', label: 'Tool schemas (available actions)', tokens: 600, relevance: 9 },
  { id: 'retrieved', label: 'Retrieved docs (relevant to this query)', tokens: 1200, relevance: 9 },
  { id: 'memory', label: 'Long-term memory (user preferences)', tokens: 250, relevance: 8 },
  { id: 'recent', label: 'Last 3 conversation turns', tokens: 500, relevance: 7 },
  { id: 'unrelated', label: 'A retrieved doc that turned out irrelevant', tokens: 900, relevance: 2 },
];

export interface FillResult { included: ContextItem[]; used: number; }

export function naiveFill(budget: number): FillResult {
  let used = 0;
  const included: ContextItem[] = [];
  for (const item of CONTEXT_ITEMS) {
    if (used + item.tokens > budget) break; // truncate: stop entirely at the first thing that doesn't fit
    included.push(item);
    used += item.tokens;
  }
  return { included, used };
}

export function engineeredFill(budget: number): FillResult {
  const sorted = [...CONTEXT_ITEMS].sort((a, b) => b.relevance - a.relevance);
  let used = 0;
  const included: ContextItem[] = [];
  for (const item of sorted) {
    if (used + item.tokens > budget) continue; // skip what doesn't fit, keep looking for smaller valuable items
    included.push(item);
    used += item.tokens;
  }
  return { included, used };
}
