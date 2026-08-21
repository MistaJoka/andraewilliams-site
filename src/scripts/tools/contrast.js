// WCAG 2.1 contrast math — no DOM. Parses a hex or rgb()/rgba() string,
// computes relative luminance and contrast ratio against a second color.

export function parseColor(input) {
  const v = input.trim();

  const hex3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v);
  if (hex3) {
    const [, r, g, b] = hex3;
    return { r: parseInt(r + r, 16), g: parseInt(g + g, 16), b: parseInt(b + b, 16) };
  }

  const hex6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(v);
  if (hex6) {
    const [, r, g, b] = hex6;
    return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
  }

  const fn = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/i.exec(v);
  if (fn) {
    const [, r, g, b] = fn.map(Number);
    if ([r, g, b].every((n) => n <= 255)) return { r, g, b };
  }

  return null;
}

function relativeLuminance({ r, g, b }) {
  const lin = (c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a, b) {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** WCAG 2.1 pass level for the given ratio, at normal or large text size. */
export function wcagLevel(ratio, large = false) {
  const aaa = large ? 4.5 : 7;
  const aa = large ? 3 : 4.5;
  if (ratio >= aaa) return 'AAA';
  if (ratio >= aa) return 'AA';
  return 'FAIL';
}
