// Astro's reference() validates the SHAPE of a link, not that its target
// exists. A typo'd topic resolves to undefined at runtime, so the page
// silently drops an edge instead of failing — verified: a post pointing at
// a nonexistent topic builds clean with exit code 0.
//
// This gate closes that hole. It throws, which fails `astro build`, which
// fails the deploy. Every relationship feature on the site (knowledge
// graph, related content, series nav, bidirectional project links) rests
// on it.
//
// REF_FIELDS is declarative on purpose: adding a reference field to a
// schema without adding it here is the failure mode this design is most
// exposed to, so the list is meant to be read next to content.config.ts.
import { getCollection, getEntry } from 'astro:content';

type Ref = { collection: string; id: string };

const REF_FIELDS: Record<string, string[]> = {
  posts: ['topics', 'series', 'project', 'related.posts', 'related.topics', 'related.projects', 'resources'],
  projects: ['topics'],
  lab: ['topics', 'project'],
  tools: ['topics'],
  series: ['topics'],
  resources: ['topics'],
  knowledge: ['topics'],
};

function at(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((v, k) => (v == null ? v : (v as Record<string, unknown>)[k]), data);
}

function isRef(v: unknown): v is Ref {
  return !!v && typeof v === 'object' && 'collection' in v && 'id' in v;
}

async function check(): Promise<void> {
  const errors: string[] = [];

  for (const [collection, fields] of Object.entries(REF_FIELDS)) {
    const entries = await getCollection(collection as 'posts');
    for (const entry of entries) {
      for (const field of fields) {
        const value = at(entry.data as Record<string, unknown>, field);
        const refs = Array.isArray(value) ? value : [value];
        for (const ref of refs) {
          if (!isRef(ref)) continue;
          if (!(await getEntry(ref as never))) {
            errors.push(`${collection}/${entry.id} → ${field} → missing ${ref.collection}/${ref.id}`);
          }
        }
      }
    }
  }

  // Series positions must be unique and within the declared length, or
  // the "04 / 09" counter and the prev/next links are lying. Positions
  // deliberately need NOT be contiguous: part 4 may publish while part 3
  // is still being written.
  const positions = new Map<string, number[]>();
  for (const post of await getCollection('posts')) {
    const ref = post.data.series;
    if (!ref || post.data.seriesOrder == null) continue;
    positions.set(ref.id, [...(positions.get(ref.id) ?? []), post.data.seriesOrder]);
  }
  for (const s of await getCollection('series')) {
    const orders = positions.get(s.id) ?? [];
    const dupes = orders.filter((n, i) => orders.indexOf(n) !== i);
    if (dupes.length) {
      errors.push(`series/${s.id} → duplicate seriesOrder ${[...new Set(dupes)].join(', ')}`);
    }
    const over = orders.filter((n) => n > s.data.plannedParts);
    if (over.length) {
      errors.push(
        `series/${s.id} → seriesOrder ${over.join(', ')} exceeds plannedParts ${s.data.plannedParts}`,
      );
    }
  }

  if (errors.length) {
    throw new Error(
      `\n[content integrity] ${errors.length} broken reference(s):\n  ${errors.join('\n  ')}\n`,
    );
  }
}

// Memoized at module scope: runs once per build, not once per page.
let ran: Promise<void> | null = null;
export function assertContentIntegrity(): Promise<void> {
  return (ran ??= check());
}
