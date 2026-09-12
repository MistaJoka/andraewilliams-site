// Single source of truth for the site's domain/topic structure, read by
// both the homepage (top-level domain list) and each domain's own index
// page (that domain's topics) — one array, not two lists to keep in sync.
export interface Topic {
  href: string;
  title: string;
  blurb: string;
  /** Shows a NEW badge on domain index pages. Flip off once it isn't. */
  isNew?: boolean;
  /** hrefs of other topics this one actually depends on or feeds into —
   *  a real dependency/causal link, not "same domain so why not". */
  related?: string[];
  /** ISO date this topic's facts were last checked. Enforced by
   *  domains.test.ts, which fails once a topic goes stale (see
   *  STALE_AFTER_DAYS there) — a real gate, not just a display field. */
  lastVerified: string;
}

export interface Domain {
  slug: string;
  name: string;
  blurb: string;
  /** A single glyph shown on the homepage card — not decoration, a wayfinding cue. */
  icon: string;
  topics: Topic[];
}

export const DOMAINS: Domain[] = [
  {
    slug: 'security',
    name: 'Security',
    icon: '▚',
    blurb: 'Cybersecurity, made approachable — inspired by Go Hack Yourself by Bryson Payne.',
    topics: [
      {
        href: '/password-cracking/', title: 'Password Cracking',
        blurb: 'Why "P@ssw0rd!" falls in under a second, and what actually holds up.',
        related: ['/phishing/'],
        lastVerified: '2026-09-07',
      },
      {
        href: '/phishing/', title: 'Phishing',
        blurb: 'Read a URL like an attacker built it — try the inspector yourself.',
        related: ['/password-cracking/', '/subnetting-cidr/'],
        lastVerified: '2026-09-07',
      },
    ],
  },
  {
    slug: 'ai',
    name: 'AI',
    icon: '⚙',
    blurb: 'How the systems actually work under the hood — no hype, no magic.',
    topics: [
      {
        href: '/how-llms-predict-text/', title: 'How LLMs Predict Text',
        blurb: 'A real (tiny) word-prediction model, built live in your browser, so you can watch it guess.',
        related: ['/context-engineering/'],
        lastVerified: '2026-09-07',
      },
      {
        href: '/context-engineering/', title: 'Context Engineering',
        blurb: 'Prompt engineering was about wording. This is about what the model even gets to see — try the budget simulator.',
        isNew: true,
        related: ['/how-llms-predict-text/', '/agentic-engineering/', '/ai-memory/', '/tech-stack-fundamentals/'],
        lastVerified: '2026-09-07',
      },
      {
        href: '/agentic-engineering/', title: 'Agentic Engineering',
        blurb: 'Why a single prompt became a loop. Watch a toy agent think, act, and observe in real time.',
        isNew: true,
        related: ['/context-engineering/', '/ai-memory/', '/tech-stack-fundamentals/'],
        lastVerified: '2026-09-07',
      },
      {
        href: '/ai-memory/', title: 'Memory',
        blurb: 'More context window isn’t memory. Watch a real salience-and-recall system decide what’s worth keeping.',
        isNew: true,
        related: ['/context-engineering/', '/agentic-engineering/'],
        lastVerified: '2026-09-07',
      },
    ],
  },
  {
    slug: 'networking',
    name: 'Networking',
    icon: '▤',
    blurb: 'The math and mechanics underneath every network, made visible instead of memorized.',
    topics: [
      {
        href: '/subnetting-cidr/', title: 'Subnetting & CIDR',
        blurb: 'A real subnet calculator, plus the 32-bit binary split behind every "/24" you\'ve typed without thinking about it.',
        isNew: true,
        related: ['/phishing/'],
        lastVerified: '2026-09-07',
      },
    ],
  },
  {
    slug: 'systems',
    name: 'Systems',
    icon: '▦',
    blurb: 'How a tech stack actually fits together, one real layer at a time.',
    topics: [
      {
        href: '/tech-stack-fundamentals/', title: 'Tech Stack Fundamentals',
        blurb: 'The stack knowledge every full-stack and AI-app dev needs — a real browser, server, and database, simulated side by side.',
        isNew: true,
        related: ['/agentic-engineering/', '/context-engineering/', '/architecture/', '/api-fundamentals/'],
        lastVerified: '2026-09-10',
      },
      {
        href: '/architecture/', title: 'Architecture',
        blurb: 'Why the same task can touch one file or ten, how an AI pipeline is actually wired, how to weigh real tradeoffs, and how to shape a brand-new app — four live checks.',
        isNew: true,
        related: ['/tech-stack-fundamentals/', '/agentic-engineering/', '/api-fundamentals/'],
        lastVerified: '2026-09-10',
      },
      {
        href: '/api-fundamentals/', title: 'API Fundamentals',
        blurb: 'An endpoint, a method, a status code — the three things every API call actually is. A real in-memory REST API to build a request against.',
        isNew: true,
        related: ['/tech-stack-fundamentals/', '/architecture/'],
        lastVerified: '2026-09-11',
      },
    ],
  },
];

export function findTopic(href: string): Topic | undefined {
  for (const domain of DOMAINS) {
    const topic = domain.topics.find((t) => t.href === href);
    if (topic) return topic;
  }
  return undefined;
}

/** Every {domain, topic} pair flattened -- for the staleness test and
 *  anything else that needs to iterate topics without caring which
 *  domain they're under. */
export function allTopics(): { domain: Domain; topic: Topic }[] {
  return DOMAINS.flatMap((domain) => domain.topics.map((topic) => ({ domain, topic })));
}
