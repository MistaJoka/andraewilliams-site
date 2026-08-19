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
  series: ['topics'],
  resources: ['topics'],
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

  // Series positions must be a contiguous 1..N with no duplicates, or
  // "04 / 09" and the prev/next links are lies.
  const positions = new Map<string, number[]>();
  for (const post of await getCollection('posts')) {
    const ref = post.data.series;
    if (!ref || post.data.seriesOrder == null) continue;
    positions.set(ref.id, [...(positions.get(ref.id) ?? []), post.data.seriesOrder]);
  }
  for (const [id, orders] of positions) {
    const sorted = [...orders].sort((a, b) => a - b);
    if (new Set(sorted).size !== sorted.length) {
      errors.push(`series/${id} → duplicate seriesOrder among [${sorted.join(', ')}]`);
    } else if (sorted.some((n, i) => n !== i + 1)) {
      errors.push(`series/${id} → seriesOrder must be 1..${sorted.length}, got [${sorted.join(', ')}]`);
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
