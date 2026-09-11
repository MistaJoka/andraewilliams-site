// Data behind the "Popular stack combos" table AND the interactive
// stack comparison panel on /tech-stack-fundamentals/ -- one source of
// data instead of two, since both render the same 5 combos.
export interface StackLayer {
  tool: string;
  offers: string;
}

export interface StackCombo {
  id: string;
  name: string;
  frontend: StackLayer;
  backend: StackLayer;
  database: StackLayer;
  /** How a request actually moves through this specific combo -- not
   *  the generic 3-tier shape, the real one for these exact tools. */
  pipelineFlow: string;
  /** The concrete scenario this combo genuinely wins in. */
  bestFor: string;
  swapWhen: string;
}

export const STACK_COMBOS: StackCombo[] = [
  {
    id: 'mern',
    name: 'MERN',
    frontend: { tool: 'React', offers: 'One language (JS) end-to-end with the backend.' },
    backend: { tool: 'Node/Express', offers: 'Fast to start, huge package ecosystem.' },
    database: { tool: 'MongoDB', offers: 'Flexible schema — fits fast-moving prototypes.' },
    pipelineFlow: 'React SPA calls a JSON API on Express; Express talks to MongoDB directly with a driver — no separate ORM layer required.',
    bestFor: "A JS-only team shipping fast, where the data shape isn't fully settled yet.",
    swapWhen: 'You need strict relational integrity (orders → customers → invoices) — swap MongoDB for PostgreSQL.',
  },
  {
    id: 'django',
    name: 'Django stack',
    frontend: { tool: 'React', offers: 'Rich, app-like client-side interactivity.' },
    backend: { tool: 'Django', offers: 'Batteries-included: auth, admin panel, and ORM out of the box.' },
    database: { tool: 'PostgreSQL', offers: 'Strong relational guarantees, mature tooling.' },
    pipelineFlow: "React calls Django's URL router; Django's ORM turns Python objects into SQL against Postgres automatically.",
    bestFor: 'A small team that wants auth, an admin panel, and a data layer working on day one — not built from scratch.',
    swapWhen: "Your team is JS-only and doesn't want to context-switch languages — swap Django for Node/Express.",
  },
  {
    id: 'rails',
    name: 'Rails stack',
    frontend: { tool: 'Hotwire', offers: 'Server-rendered HTML over the wire — no separate JS frontend to write.' },
    backend: { tool: 'Ruby on Rails', offers: '"Convention over configuration" — extremely fast to bootstrap CRUD.' },
    database: { tool: 'PostgreSQL', offers: 'Strong relational guarantees, mature tooling.' },
    pipelineFlow: "Hotwire sends the same request a link click would; Rails renders the next page's HTML server-side and streams back just the changed fragment.",
    bestFor: 'A small team validating a CRUD-heavy idea fast, without hand-writing a separate frontend app.',
    swapWhen: 'You need heavy client-side state (a real-time dashboard, a canvas editor) — swap Hotwire for React/Vue.',
  },
  {
    id: 'java',
    name: 'Java enterprise',
    frontend: { tool: 'Angular', offers: 'Opinionated structure that scales across large teams.' },
    backend: { tool: 'Spring', offers: 'Strong typing and mature tooling, common in regulated industries.' },
    database: { tool: 'MySQL', offers: 'Battle-tested, widely supported relational database.' },
    pipelineFlow: 'Angular calls a versioned REST endpoint; Spring routes it through defined service layers before touching MySQL via a mapped entity.',
    bestFor: 'A large org with strict process, long-lived systems, and many teams needing enforced structure.',
    swapWhen: "You're a small team moving fast — Spring's ceremony slows early iteration; swap for Node or Django.",
  },
  {
    id: 'serverless',
    name: 'Serverless / JAMstack',
    frontend: { tool: 'Next.js/Astro (static)', offers: 'Pre-built pages served from a CDN — near-instant loads.' },
    backend: { tool: 'Serverless functions', offers: 'Scales to zero, pay only for what actually runs.' },
    database: { tool: 'Supabase/PlanetScale', offers: 'Managed database, no server to patch or provision.' },
    pipelineFlow: 'The browser gets a page Next.js/Astro already built, straight from a CDN edge node; only the parts needing real data call a serverless function.',
    bestFor: 'Content-heavy or spiky-traffic sites where paying for an always-on server would mostly be paying for idle time.',
    swapWhen: 'You need long-running processes or WebSocket connections — swap functions for an always-on server.',
  },
];

export function getStackCombo(id: string): StackCombo | undefined {
  return STACK_COMBOS.find((s) => s.id === id);
}
