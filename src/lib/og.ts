// Real generated OG/social-preview images, one per topic and per domain,
// rendered at build time from the site's own design language (dark bg,
// accent rail, mono eyebrow) rather than a generic template borrowed
// from somewhere else. satori builds an SVG from a plain element tree
// (no JSX needed), resvg rasterizes it to PNG.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// satori accepts .ttf/.otf/.woff but not .woff2, which is why these
// point at fontsource's .woff files specifically. Resolved via
// import.meta.resolve (real Node module resolution) rather than a path
// relative to this file's own location -- that breaks once bundling
// moves the compiled module to a different directory than the source.
function resolveFont(specifier: string): Buffer {
  return readFileSync(fileURLToPath(import.meta.resolve(specifier)));
}
const spaceGroteskRegular = resolveFont('@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff');
const spaceGroteskBold = resolveFont('@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff');
const jetbrainsMonoBold = resolveFont('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff');

export interface OgCardProps {
  eyebrow: string;
  title: string;
  description: string;
}

export async function renderOgImage({ eyebrow, title, description }: OgCardProps): Promise<Buffer> {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#05070d',
          padding: '64px',
          position: 'relative',
        },
        children: [
          {
            type: 'div',
            props: { style: { position: 'absolute', top: 0, left: 0, bottom: 0, width: '10px', backgroundColor: '#56a8ff' } },
          },
          {
            type: 'div',
            props: {
              style: {
                fontFamily: 'JetBrains Mono', fontSize: '28px', fontWeight: 700, color: '#56a8ff',
                letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '32px', display: 'flex',
              },
              children: eyebrow,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '64px', color: '#e8eef8',
                lineHeight: 1.15, maxWidth: '1000px', display: 'flex',
              },
              children: title,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontFamily: 'Space Grotesk', fontWeight: 400, fontSize: '30px', color: '#9db0cc',
                marginTop: '32px', maxWidth: '950px', lineHeight: 1.4, display: 'flex',
              },
              children: description,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute', bottom: '56px', left: '64px',
                fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '24px', color: '#7a8ca9',
                letterSpacing: '2px', display: 'flex',
              },
              children: 'andraewilliams.com',
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Space Grotesk', data: spaceGroteskRegular, weight: 400, style: 'normal' },
        { name: 'Space Grotesk', data: spaceGroteskBold, weight: 700, style: 'normal' },
        { name: 'JetBrains Mono', data: jetbrainsMonoBold, weight: 700, style: 'normal' },
      ],
    },
  );

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return resvg.render().asPng();
}
