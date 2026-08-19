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
