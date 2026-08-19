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
