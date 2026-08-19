// ELI5: the one list of everything on display. The gallery grid, the
// detail panel, and the #/p/<slug> deep links are all built from this
// array — add an entry here and the site grows a project. Nothing about
// a project is hardcoded in index.html any more.
//
// Shape:
//   slug    unique id, used in the URL hash (#/p/<slug>)
//   title   display name
//   blurb   one sentence: what it is / what technique it uses
//   kind    'scene'  -> rendered by the ASCII pipeline (needs `scene`)
//           'embed'  -> rendered in a sandboxed iframe (needs `url`)
//   scene   key into js/scenes.js — the GLSL that draws it
//   poster  key into js/scenes.js used for the grid thumbnail; defaults
//           to `scene`. Embeds set this to borrow a scene as cover art.
//   url     embed only: the page to load in the sandboxed iframe
//   date    ISO day it landed
//   tools   short tech tags
//   built   the dossier line — what the AI actually authored
//   model   which model wrote it
//   source  permalink to the code

const REPO = 'https://github.com/MistaJoka/andraewilliams-site/blob/main';

export const projects = [
  {
    slug: 'particles',
    title: 'Particles',
    blurb: '24 points orbit the center; every cell sums inverse-square falloff to all of them, so each point reads as a soft light.',
    kind: 'scene',
    scene: 'particles',
    date: '2026-08-17',
    tools: ['WebGL', 'GLSL', 'ASCII'],
    built: 'Generated the orbital hash-noise field as a single sceneField() function.',
    model: 'Claude Opus 5',
    source: `${REPO}/js/scenes.js`,
  },
  {
    slug: 'aura',
    title: 'Aura',
    blurb: 'A corona in three layers: a molten core dissolving at a turbulent rim, streamers thrown off it, and shock rings expanding outward.',
    kind: 'scene',
    scene: 'aura',
    date: '2026-08-19',
    tools: ['WebGL', 'GLSL', 'fBm'],
    built: 'Rebuilt from a single wobbling circle: fbm sampled in polar coordinates so the turbulence wraps the rim rather than sliding across it, plus windowed streamers and expanding shells.',
    model: 'Claude Opus 5',
    source: `${REPO}/js/scenes.js`,
  },
  {
    slug: 'fire',
    title: 'Fire',
    blurb: 'Domain-warped fractal Brownian motion: noise fed back into itself as its own offset, which turns blobs into flame tongues.',
    kind: 'scene',
    scene: 'fire',
    date: '2026-08-17',
    tools: ['WebGL', 'GLSL', 'fBm'],
    built: 'Wrote the octave-summed noise and the self-referential domain warp.',
    model: 'Claude Opus 5',
    source: `${REPO}/js/scenes.js`,
  },
  {
    slug: 'ink-slash',
    title: 'Ink Slash',
    blurb: 'Three brush strokes on staggered clocks, each a distance-to-a-line-segment with pressure-tapered width, a chewed dry-brush edge and spatter past the tip.',
    kind: 'scene',
    scene: 'inkSlash',
    date: '2026-08-19',
    tools: ['WebGL', 'GLSL', 'SDF'],
    built: 'Rewritten after measurement showed the single stroke left the frame empty for a third of every cycle: three offset strokes, ink that runs dry from the tail forward, and noise-roughened edges.',
    model: 'Claude Opus 5',
    source: `${REPO}/js/scenes.js`,
  },
  {
    slug: 'mecha-hud',
    title: 'Mecha HUD',
    blurb: 'Targeting reticles, sweep lines and scan bars composed from primitives — a cockpit display with no images in it.',
    kind: 'scene',
    scene: 'mechaHud',
    date: '2026-08-17',
    tools: ['WebGL', 'GLSL', 'HUD'],
    built: 'Composed the ring, crosshair and sweep primitives into one layered field.',
    model: 'Claude Opus 5',
    source: `${REPO}/js/scenes.js`,
  },
  {
    slug: 'reaction',
    title: 'Reaction',
    blurb: 'Two imaginary chemicals — one feeds, one eats — obeying three rules per cell until they chase each other into a maze nobody drew.',
    kind: 'scene',
    scene: 'reaction',
    date: '2026-08-19',
    tools: ['WebGL', 'GLSL', 'FBO', 'Gray-Scott'],
    built: 'Wrote the Gray-Scott sim, packed both chemicals to 16-bit across RGBA to stop 8-bit rounding freezing the reaction, and swept feed/kill by measurement to find the maze regime.',
    model: 'Claude Opus 5',
    source: `${REPO}/js/reaction-sim.js`,
  },
];

export function findProject(slug) {
  return projects.find((p) => p.slug === slug) || null;
}

// The scene key a project's grid thumbnail should draw: its own scene,
// or an explicit poster (how an embed borrows cover art).
export function posterScene(project) {
  return project.poster || project.scene || null;
}
