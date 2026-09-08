import type { APIRoute } from 'astro';
import { DOMAINS } from '../../lib/domains';
import { renderOgImage } from '../../lib/og';

interface CardProps { eyebrow: string; title: string; description: string; }

export function getStaticPaths() {
  const paths: { params: { slug: string }; props: CardProps }[] = [];
  for (const domain of DOMAINS) {
    paths.push({
      params: { slug: domain.slug },
      props: { eyebrow: 'Domain', title: domain.name, description: domain.blurb },
    });
    for (const topic of domain.topics) {
      const slug = topic.href.replace(/^\/|\/$/g, '');
      paths.push({
        params: { slug },
        props: { eyebrow: domain.name, title: topic.title, description: topic.blurb },
      });
    }
  }
  return paths;
}

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgImage(props as CardProps);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
