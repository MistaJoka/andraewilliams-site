// Pure logic behind the "cache in action" mini-demo in the Server step
// of /tech-stack-fundamentals/ -- deliberately a separate module from
// stack-sim.ts (the main 3-tier live simulator), not bolted onto it,
// so the page's core "three unchanging jobs" narrative and its
// already-verified pipeline stay completely untouched.
const cache = new Set<string>();

export function resetCacheDemo(): void {
  cache.clear();
}

export interface CacheRunResult {
  hit: boolean;
  steps: string[];
}

export function runCachedQuery(query: string): CacheRunResult {
  if (cache.has(query)) {
    return {
      hit: true,
      steps: [
        `Server asks cache for "${query}"`,
        'Cache HIT — returns instantly, database never touched',
      ],
    };
  }
  cache.add(query);
  return {
    hit: false,
    steps: [
      `Server asks cache for "${query}"`,
      'Cache MISS — asks the database',
      'Database runs the real query (slow)',
      'Result cached for next time',
    ],
  };
}
