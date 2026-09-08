// Single source of truth for the site's domain/topic structure, read by
// both the homepage (top-level domain list) and each domain's own index
// page (that domain's topics) — one array, not two lists to keep in sync.
export interface Topic {
  href: string;
  title: string;
  blurb: string;
  /** Shows a NEW badge on domain index pages. Flip off once it isn't. */
  isNew?: boolean;
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
      { href: '/password-cracking/', title: 'Password Cracking', blurb: 'Why "P@ssw0rd!" falls in under a second, and what actually holds up.' },
      { href: '/phishing/', title: 'Phishing', blurb: 'Read a URL like an attacker built it — try the inspector yourself.' },
    ],
  },
  {
    slug: 'ai',
    name: 'AI',
    icon: '⚙',
    blurb: 'How the systems actually work under the hood — no hype, no magic.',
    topics: [
      { href: '/how-llms-predict-text/', title: 'How LLMs Predict Text', blurb: 'A real (tiny) word-prediction model, built live in your browser, so you can watch it guess.' },
      { href: '/context-engineering/', title: 'Context Engineering', blurb: 'Prompt engineering was about wording. This is about what the model even gets to see — try the budget simulator.', isNew: true },
      { href: '/agentic-engineering/', title: 'Agentic Engineering', blurb: 'Why a single prompt became a loop. Watch a toy agent think, act, and observe in real time.', isNew: true },
      { href: '/ai-memory/', title: 'Memory', blurb: 'More context window isn’t memory. Watch a real salience-and-recall system decide what’s worth keeping.', isNew: true },
    ],
  },
  {
    slug: 'networking',
    name: 'Networking',
    icon: '▤',
    blurb: 'The math and mechanics underneath every network, made visible instead of memorized.',
    topics: [
      { href: '/subnetting-cidr/', title: 'Subnetting & CIDR', blurb: 'A real subnet calculator, plus the 32-bit binary split behind every "/24" you\'ve typed without thinking about it.', isNew: true },
    ],
  },
];
