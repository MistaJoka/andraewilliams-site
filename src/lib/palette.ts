// The ASCII engine's colour ramp, derived from the same design tokens the
// CSS uses. Before this, the background colour lived in three places —
// a CSS custom property, a GLSL literal, and a JS literal in main.js —
// so changing it meant remembering all three. Now the ramp is passed into
// the pipeline at construction and this file is the only source.
export const BG = '#05070d';

/** Six stops, dark to hot, matching --bg-0 through --topic-risk. */
export const RAMP: string[] = [
  '#05070d', // bg-0
  '#2f79cc', // accent-dim
  '#22d3ee', // topic-cyber
  '#4ade80', // topic-homelab
  '#fbbf24', // status-testing
  '#ff6b7a', // topic-risk
];

export const hexToRgbFloat = (hex: string): [number, number, number] => {
  const c = hex.replace('#', '');
  return [
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255,
  ];
};

/**
 * Resolves a design token name (e.g. "--topic-ai") to its hex value by
 * reading tokens.css at build time.
 *
 * OG cards are rasterised by satori, which has no CSS custom properties,
 * so it needs literal hex. Parsing the stylesheet rather than duplicating
 * a colour map keeps tokens.css the single source — the same reason the
 * GLSL ramp is generated rather than hand-copied.
 *
 * Build-time only: uses node:fs.
 */
export async function resolveToken(name: string, fallback = '#56a8ff'): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  if (!tokenCache) {
    const css = await readFile('src/styles/tokens.css', 'utf8');
    tokenCache = new Map(
      [...css.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map((m) => [m[1]!, m[2]!]),
    );
  }
  return tokenCache.get(name) ?? fallback;
}

let tokenCache: Map<string, string> | null = null;
