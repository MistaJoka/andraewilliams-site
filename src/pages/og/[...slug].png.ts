// One OG card per content entry, rendered at build time to a static PNG.
// Route mirrors the page it belongs to: /og/posts/<slug>.png
import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { renderOgCard, OG_WIDTH, OG_HEIGHT } from '../../lib/og';
import { resolveToken } from '../../lib/palette';
import { cardSpec } from '../../lib/card-spec';
import { formatDifficulty, seriesCounter } from '../../lib/format';

export async function getStaticPaths() {
  const [posts, projects, lab, tools] = await Promise.all([
    getCollection('posts', ({ data }) => !data.draft),
    getCollection('projects', ({ data }) => !data.draft),
    getCollection('lab', ({ data }) => !data.draft),
    getCollection('tools', ({ data }) => !data.draft),
  ]);

  const paths: { params: { slug: string }; props: Record<string, unknown> }[] = [];

  for (const p of posts) {
    const spec = cardSpec(p.data.type);
    let footnote: string | undefined;
    if (p.data.series && p.data.seriesOrder != null) {
      const s = await getEntry(p.data.series);
      if (s) footnote = `${s.data.title} ${seriesCounter(p.data.seriesOrder, s.data.plannedParts)}`;
    }
    paths.push({
      params: { slug: `posts/${p.id}` },
      props: {
        eyebrow: `${p.data.type} · ${formatDifficulty(p.data.difficulty)}`,
        title: p.data.title,
        description: p.data.description,
        footnote,
        token: spec.accent,
      },
    });
  }

  for (const p of projects) {
    paths.push({
      params: { slug: `projects/${p.id}` },
      props: {
        eyebrow: `PROJECT · ${p.data.status}`,
        title: p.data.title,
        description: p.data.description,
        footnote: p.data.tools.slice(0, 4).join(' · '),
        token: '--accent',
      },
    });
  }

  for (const l of lab) {
    paths.push({
      params: { slug: `lab/${l.id}` },
      props: {
        eyebrow: `LAB · ${l.data.status}`,
        title: l.data.title,
        description: l.data.description,
        footnote: l.data.tools.slice(0, 4).join(' · '),
        token: '--status-testing',
      },
    });
  }

  for (const t of tools) {
    paths.push({
      params: { slug: `tools/${t.id}` },
      props: {
        eyebrow: `TOOL · ${t.data.status}`,
        title: t.data.title,
        description: t.data.description,
        footnote: t.data.tools.slice(0, 4).join(' · '),
        token: '--accent',
      },
    });
  }

  return paths;
}

export const GET: APIRoute = async ({ props }) => {
  const { eyebrow, title, description, footnote, token } = props as {
    eyebrow: string; title: string; description: string; footnote?: string; token: string;
  };
  const png = await renderOgCard({
    eyebrow,
    title,
    description,
    footnote,
    accent: await resolveToken(token),
  });
  return new Response(new Uint8Array(png), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=31536000, immutable',
      'x-dimensions': `${OG_WIDTH}x${OG_HEIGHT}`,
    },
  });
};
