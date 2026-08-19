// Build-time Open Graph card generation. Renders the site's own panel
// language — hairline frame, corner bracket, accent rail, mono eyebrow —
// so a shared link looks like the site rather than like a generic card.
//
// satori builds an SVG from a React-ish element tree; resvg rasterises it.
// Both are devDependencies: they run at build time and ship nothing to
// the browser.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { BG } from './palette';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const FONT_DIR = 'node_modules/@fontsource';
// satori accepts ttf/otf/woff but NOT woff2 — verified: woff2 throws
// "Unsupported OpenType signature wOF2". Fontsource ships both.
const font = (pkg: string, file: string) => readFileSync(`${FONT_DIR}/${pkg}/files/${file}`);

const FONTS = [
  { name: 'Grotesk', data: font('space-grotesk', 'space-grotesk-latin-700-normal.woff'), weight: 700 as const, style: 'normal' as const },
  { name: 'Grotesk', data: font('space-grotesk', 'space-grotesk-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
  { name: 'Mono', data: font('jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
];

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, ...(children === undefined ? {} : { children }) },
});

export interface OgCard {
  /** Small uppercase label above the title, e.g. "ARCHITECTURE · BEGINNER". */
  eyebrow: string;
  title: string;
  /** One-line summary under the title. Clipped if very long. */
  description?: string;
  /** Bottom-right detail, e.g. "BUILDING AN AI AGENT 04 / 09". */
  footnote?: string;
  /** Resolved hex — CSS custom properties do not exist in satori. */
  accent: string;
}

export async function renderOgCard(card: OgCard): Promise<Buffer> {
  const { eyebrow, title, description, footnote, accent } = card;

  const svg = await satori(
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: BG,
        // The faint grid from the site, at card scale.
        backgroundImage:
          `linear-gradient(#1e2739 1px, transparent 1px), linear-gradient(90deg, #1e2739 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        padding: '64px 72px',
        position: 'relative',
        fontFamily: 'Grotesk',
      },
      [
        // accent rail
        h('div', {
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 12, backgroundColor: accent,
        }),
        // corner bracket, top right — the same mark the featured panel uses
        h('div', {
          position: 'absolute', top: 40, right: 40, width: 56, height: 56,
          borderTop: `4px solid ${accent}`, borderRight: `4px solid ${accent}`,
        }),

        h('div', {
          display: 'flex', fontFamily: 'Mono', fontSize: 24, letterSpacing: 2,
          color: accent, textTransform: 'uppercase', marginBottom: 28,
        }, eyebrow),

        h('div', {
          display: 'flex', fontSize: title.length > 52 ? 62 : 76, fontWeight: 700,
          color: '#e8eef8', lineHeight: 1.1, letterSpacing: -1, maxWidth: 980,
        }, title),

        description
          ? h('div', {
              display: 'flex', fontSize: 28, color: '#9db0cc', marginTop: 28,
              lineHeight: 1.4, maxWidth: 900,
            }, description)
          : h('div', { display: 'flex' }),

        // footer pinned to the bottom
        h('div', {
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          marginTop: 'auto', fontFamily: 'Mono', fontSize: 22, letterSpacing: 2,
          color: '#7a8ca9', textTransform: 'uppercase', width: '100%',
        }, [
          h('div', { display: 'flex', color: '#e8eef8' }, 'ANDRAE WILLIAMS'),
          h('div', { display: 'flex' }, footnote ?? 'andraewilliams.com'),
        ]),
      ],
    ) as never,
    { width: OG_WIDTH, height: OG_HEIGHT, fonts: FONTS },
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng();
  return Buffer.from(png);
}
