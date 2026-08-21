// Turns a NetScene into an SVG string. Pure and DOM-free on purpose: the
// exact same function draws the entry scene at build time (Astro
// frontmatter, set:html) and every scene reached by drilling down,
// client-side (container.innerHTML). One renderer, no drift between the
// no-JS baseline and the enhanced version.
import type { NetScene } from './scenes';

const W = 880;
const H = 460;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderScene(scene: NetScene): string {
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));

  const edges = scene.edges
    .map((e) => {
      const a = byId.get(e.from);
      const b = byId.get(e.to);
      if (!a || !b) return '';
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="net-edge" />`;
    })
    .join('');

  const nodes = scene.nodes
    .map((n) => {
      const r = n.drillInto ? 9 : 6;
      const label = n.drillInto ? `▾ ${n.label}` : n.label;
      return `
        <g class="net-node net-node--${n.kind}${n.drillInto ? ' net-node--drill' : ''}"
           data-node-id="${n.id}"
           tabindex="0" role="button"
           aria-label="${esc(n.label)}${n.drillInto ? ' — opens the next level' : ''}">
          <circle class="halo" cx="${n.x}" cy="${n.y}" r="${r + 7}" />
          <circle class="dot" cx="${n.x}" cy="${n.y}" r="${r}" />
          <text x="${n.x}" y="${n.y + r + 18}" text-anchor="middle" class="net-label">${esc(label)}</text>
        </g>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(scene.title)}" class="net-svg">${edges}${nodes}</svg>`;
}
