// Build-time search index. Emitted as a static file and fetched lazily on
// first ⌘K, so reading routes pay zero bytes for search.
//
// Keys are single characters because this payload is the one thing on the
// site that grows linearly with content: t=title, d=description,
// k=kind, u=url, g=keywords.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

interface Doc { t: string; d: string; k: string; u: string; g: string }

const NAV: Doc[] = [
  { t: 'Home', d: 'Selected work, notes and the lab', k: 'NAV', u: '/', g: 'start index' },
  { t: 'Notes', d: 'Everything, newest first', k: 'NAV', u: '/feed/', g: 'all posts stream feed' },
  { t: 'Topics', d: 'The map of what I work on', k: 'NAV', u: '/topics/', g: 'hubs subjects' },
  { t: 'Lab', d: 'Active experiments', k: 'NAV', u: '/lab/', g: 'experiments shaders' },
  { t: 'Work', d: 'Things I actually built', k: 'NAV', u: '/projects/', g: 'work builds projects' },
  { t: 'Resources', d: 'Curated reference library', k: 'NAV', u: '/resources/', g: 'tools links' },
  { t: 'About', d: 'Who this is', k: 'NAV', u: '/about/', g: 'bio contact' },
];

export const GET: APIRoute = async () => {
  const docs: Doc[] = [...NAV];

  for (const p of await getCollection('posts', ({ data }) => !data.draft)) {
    docs.push({
      t: p.data.title,
      d: p.data.description.slice(0, 110),
      k: p.data.type,
      u: `/posts/${p.id}/`,
      g: [...p.data.tags, ...p.data.topics.map((t) => t.id)].join(' '),
    });
  }
  for (const s of await getCollection('series')) {
    docs.push({ t: s.data.title, d: s.data.description.slice(0, 110), k: 'SERIES', u: `/series/${s.id}/`, g: s.data.topics.map((t) => t.id).join(' ') });
  }
  for (const t of await getCollection('topics')) {
    docs.push({ t: t.data.label, d: t.data.blurb.slice(0, 110), k: 'TOPIC', u: `/topics/${t.data.id}/`, g: t.data.id });
  }
  for (const p of await getCollection('projects', ({ data }) => !data.draft)) {
    docs.push({ t: p.data.title, d: p.data.description.slice(0, 110), k: 'PROJECT', u: `/projects/${p.id}/`, g: [...p.data.tags, ...p.data.tools].join(' ') });
  }
  for (const l of await getCollection('lab', ({ data }) => !data.draft)) {
    docs.push({ t: l.data.title, d: l.data.description.slice(0, 110), k: 'LAB', u: `/lab/${l.id}/`, g: [...l.data.tags, ...l.data.tools].join(' ') });
  }
  for (const r of await getCollection('resources')) {
    docs.push({ t: r.data.title, d: r.data.why.slice(0, 110), k: 'RESOURCE', u: `/resources/#${r.id}`, g: [...r.data.tags, r.data.kind].join(' ') });
  }

  return new Response(JSON.stringify(docs), {
    headers: { 'content-type': 'application/json' },
  });
};
