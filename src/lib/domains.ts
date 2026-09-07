// Single source of truth for the site's domain/topic structure, read by
// both the homepage (top-level domain list) and each domain's own index
// page (that domain's topics) — one array, not two lists to keep in sync.
export interface Topic {
  href: string;
  title: string;
  blurb: string;
}

export interface Domain {
  slug: string;
  name: string;
  blurb: string;
  topics: Topic[];
}

export const DOMAINS: Domain[] = [
  {
    slug: 'security',
    name: 'Security',
    blurb: 'Cybersecurity, made approachable — inspired by Go Hack Yourself by Bryson Payne.',
    topics: [
      { href: '/password-cracking/', title: 'Password Cracking', blurb: 'Why "P@ssw0rd!" falls in under a second, and what actually holds up.' },
      { href: '/phishing/', title: 'Phishing', blurb: 'Read a URL like an attacker built it — try the inspector yourself.' },
    ],
  },
];
