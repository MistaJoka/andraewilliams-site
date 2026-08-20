// Resolves the relationship edges a page needs. Bidirectional links are
// DERIVED here rather than authored on both sides, so the two halves can
// never drift out of sync.
import { getCollection, getEntry, getEntries } from 'astro:content';

export async function resolveRelated(post: any) {
  const [posts, topics, project] = await Promise.all([
    getEntries(post.data.related.posts ?? []),
    getEntries([...(post.data.topics ?? []), ...(post.data.related.topics ?? [])]),
    post.data.project ? getEntry(post.data.project) : Promise.resolve(undefined),
  ]);
  // A post always lists its own topics; dedupe against explicit extras.
  const seen = new Set<string>();
  const uniqueTopics = topics.filter((t: any) => !seen.has(t.id) && seen.add(t.id));
  return { posts: posts.filter(Boolean), topics: uniqueTopics, project };
}

/** Published siblings of a series, ordered by position. */
export async function seriesSiblings(seriesId: string) {
  const posts = await getCollection('posts', ({ data }) => !data.draft && data.series?.id === seriesId);
  return posts.sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));
}

/** Posts that name this project — the reverse edge, computed not authored. */
export async function postsForProject(projectId: string) {
  return getCollection(
    'posts',
    ({ data }) =>
      !data.draft &&
      (data.project?.id === projectId ||
        (data.related.projects ?? []).some((p: any) => p.id === projectId)),
  );
}

/* ------------------------------------------------------------------ *
 * Knowledge graph
 *
 * Spec §19 asks for a lightweight visual relationship component driven
 * by the SAME data as the rest of the site — not a freeform graph engine
 * (§36 rules that out for V1). So this derives a depth-1 neighbourhood
 * from the existing references and nothing else. A richer graph can walk
 * further later without any content migration, because the edges are
 * already in the frontmatter.
 * ------------------------------------------------------------------ */

export interface GraphNode {
  id: string;
  label: string;
  kind: 'POST' | 'TOPIC' | 'SERIES' | 'PROJECT' | 'LAB';
  href: string;
  /** CSS custom property name — resolved to a colour by the component. */
  accent: string;
}

export interface Graph {
  center: GraphNode;
  neighbours: GraphNode[];
}

/** Keeps the picture readable; the full set is always listed in text. */
const MAX_NEIGHBOURS = 8;

export async function buildPostGraph(post: any, cardAccent: string): Promise<Graph> {
  const neighbours: GraphNode[] = [];

  const topics = (await getEntries(post.data.topics ?? [])) as any[];
  for (const t of topics) {
    neighbours.push({
      id: `topic:${t.id}`, label: t.data.label, kind: 'TOPIC',
      href: `/topics/${t.data.id}/`, accent: t.data.accent,
    });
  }

  if (post.data.series) {
    const s = (await getEntry(post.data.series)) as any;
    if (s) {
      neighbours.push({
        id: `series:${s.id}`, label: s.data.title, kind: 'SERIES',
        href: `/series/${s.id}/`, accent: '--accent',
      });
    }
  }

  if (post.data.project) {
    const p = (await getEntry(post.data.project)) as any;
    if (p) {
      neighbours.push({
        id: `project:${p.id}`, label: p.data.title, kind: 'PROJECT',
        href: `/projects/${p.id}/`, accent: '--status-production',
      });
    }
  }

  const related = await getEntries(post.data.related?.posts ?? []);
  for (const r of related.filter(Boolean)) {
    neighbours.push({
      id: `post:${(r as any).id}`, label: (r as any).data.title, kind: 'POST',
      href: `/posts/${(r as any).id}/`, accent: '--text-1',
    });
  }

  // Series siblings are genuine edges and cost nothing to include, but
  // they come last so explicit relationships win the limited slots.
  if (post.data.series) {
    const siblings = await seriesSiblings(post.data.series.id);
    for (const s of siblings) {
      if (s.id === post.id) continue;
      const id = `post:${s.id}`;
      if (neighbours.some((n) => n.id === id)) continue;
      neighbours.push({
        id, label: s.data.title, kind: 'POST',
        href: `/posts/${s.id}/`, accent: '--text-1',
      });
    }
  }

  return {
    center: {
      id: `post:${post.id}`, label: post.data.title, kind: 'POST',
      href: `/posts/${post.id}/`, accent: cardAccent,
    },
    neighbours: neighbours.slice(0, MAX_NEIGHBOURS),
  };
}

/** A topic's neighbourhood: the topics it co-occurs with, then its posts. */
export async function buildTopicGraph(topic: any): Promise<Graph> {
  const posts = await getCollection(
    'posts',
    ({ data }) => !data.draft && data.topics.some((r: any) => r.id === topic.id),
  );

  const coIds = new Set<string>();
  for (const p of posts) for (const r of p.data.topics) if (r.id !== topic.id) coIds.add(r.id);
  const allTopics = await getCollection('topics');

  const neighbours: GraphNode[] = allTopics
    .filter((t) => coIds.has(t.id))
    .map((t) => ({
      id: `topic:${t.id}`, label: t.data.label, kind: 'TOPIC' as const,
      href: `/topics/${t.data.id}/`, accent: t.data.accent,
    }));

  for (const p of [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime())) {
    neighbours.push({
      id: `post:${p.id}`, label: p.data.title, kind: 'POST',
      href: `/posts/${p.id}/`, accent: '--text-1',
    });
  }

  return {
    center: {
      id: `topic:${topic.id}`, label: topic.data.label, kind: 'TOPIC',
      href: `/topics/${topic.data.id}/`, accent: topic.data.accent,
    },
    neighbours: neighbours.slice(0, MAX_NEIGHBOURS),
  };
}
