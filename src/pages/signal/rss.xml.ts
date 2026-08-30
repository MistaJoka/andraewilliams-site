// A separate feed on purpose. Subscribers to /rss.xml signed up for Andrae's
// writing; they should not start receiving machine-written summaries of other
// people's work because a flag flipped in a vault. Anyone who wants these
// subscribes to this feed instead.
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const entries = await getCollection('signal', ({ data }) => !data.draft);
  return rss({
    title: 'Andrae Williams — Signal',
    description:
      'AI-written compressions of articles and talks worth keeping. Every entry credits and links its original source.',
    site: context.site!,
    items: entries
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map((entry) => ({
        title: entry.data.title,
        // The credit travels with the item, so attribution survives
        // syndication into a reader that never shows the page.
        description: `${entry.data.description}\n\nSummary of "${entry.data.source.title}"${
          entry.data.source.author ? ` by ${entry.data.source.author}` : ''
        } — ${entry.data.source.url}`,
        pubDate: entry.data.date,
        link: `/signal/${entry.id}/`,
        categories: [entry.data.track, entry.data.source.kind, ...entry.data.topics.map((t) => t.id)],
      })),
  });
}
