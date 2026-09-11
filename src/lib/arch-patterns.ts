// Data behind the "Architectural patterns" compare tool on
// /tech-stack-fundamentals/. Deliberately a separate axis from
// stack-combos.ts: a named stack (MERN, Django, ...) is *which tools*
// you picked, a pattern is *how the pieces are organized and run* --
// any named stack could be deployed as a monolith, split into
// microservices, or run serverless. Same shape as stack-combos.ts on
// purpose, so the two compare panels feel like one family, not two
// unrelated widgets.
export interface ArchPattern {
  id: string;
  name: string;
  eli5: string;
  /** How a request actually moves through a system built this way. */
  pipelineFlow: string;
  bestFor: string;
  tradeoff: string;
}

export const ARCH_PATTERNS: ArchPattern[] = [
  {
    id: 'monolith',
    name: 'Monolith',
    eli5: 'One codebase, one deployable, does everything — frontend, backend, and data access all ship together.',
    pipelineFlow: 'Browser hits one server; that same server handles routing, business logic, and talks to the database directly — no network hop between "services."',
    bestFor: 'Small teams, early-stage products — one thing to deploy, debug, and reason about.',
    tradeoff: "Everything scales together, even the one part that's actually slow — and one bug can take the whole thing down.",
  },
  {
    id: 'microservices',
    name: 'Microservices',
    eli5: 'The backend ("decide") job gets split into several small independent services, each owning one responsibility.',
    pipelineFlow: 'Browser hits a gateway; the gateway routes to the Orders service, which itself calls the Inventory service over the network before responding.',
    bestFor: 'Large teams working independently, or one part of a system that genuinely needs to scale separately from the rest.',
    tradeoff: "Trades one big problem (a monolith's complexity) for many small ones — network calls, partial failures, distributed debugging.",
  },
  {
    id: 'serverless',
    name: 'Serverless',
    eli5: 'No server to keep running — your backend code only exists for the moment it takes to handle one request, then disappears.',
    pipelineFlow: 'Browser hits a function URL; the platform spins up your code just long enough to run it, then throws the instance away.',
    bestFor: "Spiky, unpredictable traffic — pay only for real requests, scales to zero when nobody's using it.",
    tradeoff: "Cold starts add latency to the first request; long-running or stateful work doesn't fit this shape at all.",
  },
  {
    id: 'jamstack',
    name: 'JAMstack',
    eli5: 'The frontend is pre-built at deploy time and served as static files from a CDN — the "server" step barely exists for most pages.',
    pipelineFlow: 'Browser gets a pre-rendered HTML file straight from a CDN edge node; only specific interactive bits call out to an API or serverless function afterward.',
    bestFor: "Content-heavy sites (blogs, marketing, docs) where the data doesn't change per-visitor.",
    tradeoff: "Doesn't fit truly dynamic, per-user data well without bolting serverless functions back on anyway.",
  },
];

export function getArchPattern(id: string): ArchPattern | undefined {
  return ARCH_PATTERNS.find((p) => p.id === id);
}
