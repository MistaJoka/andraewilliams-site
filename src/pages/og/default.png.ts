import type { APIRoute } from 'astro';
import { renderOgImage } from '../../lib/og';

export const GET: APIRoute = async () => {
  const png = await renderOgImage({
    eyebrow: 'Explained Plainly',
    title: 'Complex topics, explained plainly.',
    description: 'ELI5 and TL;DR first, hands-on labs where it helps.',
  });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
