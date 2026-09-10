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
  swapWhen: string;
}

export const STACK_COMBOS: StackCombo[] = [
  {
    id: 'mern',
    name: 'MERN',
    frontend: { tool: 'React', offers: 'One language (JS) end-to-end with the backend.' },
    backend: { tool: 'Node/Express', offers: 'Fast to start, huge package ecosystem.' },
    database: { tool: 'MongoDB', offers: 'Flexible schema — fits fast-moving prototypes.' },
    swapWhen: 'You need strict relational integrity (orders → customers → invoices) — swap MongoDB for PostgreSQL.',
  },
  {
    id: 'django',
    name: 'Django stack',
    frontend: { tool: 'React', offers: 'Rich, app-like client-side interactivity.' },
    backend: { tool: 'Django', offers: 'Batteries-included: auth, admin panel, and ORM out of the box.' },
    database: { tool: 'PostgreSQL', offers: 'Strong relational guarantees, mature tooling.' },
    swapWhen: "Your team is JS-only and doesn't want to context-switch languages — swap Django for Node/Express.",
  },
  {
    id: 'rails',
    name: 'Rails stack',
    frontend: { tool: 'Hotwire', offers: 'Server-rendered HTML over the wire — no separate JS frontend to write.' },
    backend: { tool: 'Ruby on Rails', offers: '"Convention over configuration" — extremely fast to bootstrap CRUD.' },
    database: { tool: 'PostgreSQL', offers: 'Strong relational guarantees, mature tooling.' },
    swapWhen: 'You need heavy client-side state (a real-time dashboard, a canvas editor) — swap Hotwire for React/Vue.',
  },
  {
    id: 'java',
    name: 'Java enterprise',
    frontend: { tool: 'Angular', offers: 'Opinionated structure that scales across large teams.' },
    backend: { tool: 'Spring', offers: 'Strong typing and mature tooling, common in regulated industries.' },
    database: { tool: 'MySQL', offers: 'Battle-tested, widely supported relational database.' },
    swapWhen: "You're a small team moving fast — Spring's ceremony slows early iteration; swap for Node or Django.",
  },
  {
    id: 'serverless',
    name: 'Serverless / JAMstack',
    frontend: { tool: 'Next.js/Astro (static)', offers: 'Pre-built pages served from a CDN — near-instant loads.' },
    backend: { tool: 'Serverless functions', offers: 'Scales to zero, pay only for what actually runs.' },
    database: { tool: 'Supabase/PlanetScale', offers: 'Managed database, no server to patch or provision.' },
    swapWhen: 'You need long-running processes or WebSocket connections — swap functions for an always-on server.',
  },
];

export function getStackCombo(id: string): StackCombo | undefined {
  return STACK_COMBOS.find((s) => s.id === id);
}
