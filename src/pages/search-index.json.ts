import type { APIRoute } from 'astro';
import { DOMAINS } from '../lib/domains';

export interface SearchEntry { kind: 'domain' | 'topic'; title: string; description: string; url: string; }

export const GET: APIRoute = () => {
  const entries: SearchEntry[] = [];
  for (const domain of DOMAINS) {
    entries.push({ kind: 'domain', title: domain.name, description: domain.blurb, url: `/${domain.slug}/` });
    for (const topic of domain.topics) {
      entries.push({ kind: 'topic', title: topic.title, description: topic.blurb, url: topic.href });
    }
  }
  return new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json' } });
};
