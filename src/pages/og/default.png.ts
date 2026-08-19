import type { APIRoute } from 'astro';
import { renderOgCard } from '../../lib/og';
import { resolveToken } from '../../lib/palette';

export const GET: APIRoute = async () => {
  const png = await renderOgCard({
    eyebrow: 'Technical second brain',
    title: 'Andrae Williams',
    description:
      'A living technical feed and digital laboratory — AI, software, cyber, homelab, risk, MMA and anime. Built and documented in public.',
    footnote: 'AI · SOFTWARE · CYBER · RISK · SYSTEMS',
    accent: await resolveToken('--accent'),
  });
  return new Response(new Uint8Array(png), {
    headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' },
  });
};
