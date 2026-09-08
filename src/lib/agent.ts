// Pure logic behind /agentic-engineering/ -- no DOM, so it's directly
// unit-testable (see agent.test.ts) and importable by the page.

export interface Package { id: string; weightKg: number; }
export interface Step { type: 'thought' | 'action' | 'observation' | 'final'; text: string; }

export const PACKAGES: Package[] = [
  { id: 'A', weightKg: 12 },
  { id: 'B', weightKg: 47 },
  { id: 'C', weightKg: 8 },
  { id: 'D', weightKg: 33 },
  { id: 'E', weightKg: 41 },
];

// The "tool": returns exactly one package's weight per call, same as a
// real API the agent can't see all the results of at once.
export function checkWeight(packages: Package[], id: string): number | null {
  return packages.find((p) => p.id === id)?.weightKg ?? null;
}

export function* runAgent(packages: Package[] = PACKAGES): Generator<Step> {
  yield { type: 'thought', text: `Task: find the heaviest of ${packages.length} packages. I can only check one at a time.` };
  let best: { id: string; weightKg: number } | null = null;
  for (const pkg of packages) {
    yield { type: 'action', text: `checkWeight("${pkg.id}")` };
    const weight = checkWeight(packages, pkg.id)!;
    yield { type: 'observation', text: `${weight} kg` };
    if (!best || weight > best.weightKg) {
      best = { id: pkg.id, weightKg: weight };
      yield { type: 'thought', text: `New heaviest so far: ${pkg.id} at ${weight} kg.` };
    } else {
      yield { type: 'thought', text: `${pkg.id} (${weight} kg) is lighter than current best (${best.id}, ${best.weightKg} kg). Continuing.` };
    }
  }
  yield { type: 'final', text: `Checked all ${packages.length} packages. Heaviest: ${best!.id} at ${best!.weightKg} kg.` };
}
