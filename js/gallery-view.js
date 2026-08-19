import { AsciiPipeline } from './ascii-pipeline.js';
import { projects, findProject, posterScene } from './projects.js';
import { onRoute, setHash } from './router.js';

// Drives the gallery section. Two modes:
//   grid  — every project as a viewport into ONE shared WebGL context
//           (scissor per tile), so N projects still cost 1 GL context.
//   focus — one project: either that scene fullscreen on the same
//           canvas, or a sandboxed iframe for an embedded project, with
//           a dossier panel underneath either way.
// Which mode is showing is owned by the URL (js/router.js), not by a
// click handler — so deep links, Back and Forward all work.

// ELI5: text from the manifest is inserted as text nodes, never as HTML,
// so a stray < or & in a blurb can never become markup.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function buildTile(project) {
  const tile = el('button', 'gallery-tile');
  tile.type = 'button';
  tile.dataset.slug = project.slug;
  const scene = posterScene(project);
  if (scene) tile.dataset.scene = scene;
  tile.setAttribute('aria-label', `${project.title} — ${project.blurb}`);
  tile.appendChild(el('span', 'tile-title', project.title));
  return tile;
}

// The dossier: what it is, when it landed, what built it. Rebuilt per
// project rather than shown/hidden, so there is no stale-content state.
function buildDetail(project) {
  const frag = document.createDocumentFragment();
  frag.appendChild(el('h3', 'detail-title', project.title));
  frag.appendChild(el('p', 'detail-blurb', project.blurb));

  const meta = el('dl', 'detail-meta');
  const rows = [
    ['Built', project.built],
    ['Model', project.model],
    ['Shipped', project.date],
    ['Stack', (project.tools || []).join(' · ')],
  ].filter(([, value]) => value);
  for (const [label, value] of rows) {
    meta.appendChild(el('dt', null, label));
    meta.appendChild(el('dd', null, value));
  }
  frag.appendChild(meta);

  if (project.source) {
    const link = el('a', 'detail-source', 'View source →');
    link.href = project.source;
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    frag.appendChild(link);
  }
  return frag;
}

export function initGalleryView(elements, scenes, { bgColor, reduceMotion = false } = {}) {
  const { canvas, overlay, backButton, embed, detail, status } = elements;

  let pipeline;
  try {
    pipeline = new AsciiPipeline(canvas, scenes, { bgColor });
  } catch (err) {
    console.warn('Gallery pipeline unavailable:', err);
    return null;
  }

  overlay.replaceChildren(...projects.map(buildTile));
  const tiles = Array.from(overlay.querySelectorAll('.gallery-tile'));

  let mode = 'grid';
  let active = null;      // the focused project, or null in grid mode
  let cellRects = [];
  let lastTile = null;    // where focus goes back to when leaving focus mode
  let announcedOnce = false;

  // Tiles are laid out by CSS; the renderer needs their boxes in canvas
  // space, so they are measured from the DOM rather than computed twice.
  function measureCells() {
    const canvasRect = canvas.getBoundingClientRect();
    cellRects = tiles
      .filter((tile) => tile.dataset.scene)
      .map((tile) => {
        const r = tile.getBoundingClientRect();
        return {
          name: tile.dataset.scene,
          x: r.left - canvasRect.left,
          y: r.top - canvasRect.top,
          w: r.width,
          h: r.height,
        };
      });
  }

  function showEmbed(project) {
    // No allow-same-origin: an embedded project gets scripts but stays
    // in an opaque origin, so it cannot reach this page's DOM or storage.
    embed.setAttribute('sandbox', 'allow-scripts');
    embed.setAttribute('referrerpolicy', 'no-referrer');
    embed.setAttribute('loading', 'lazy');
    embed.title = project.title;
    embed.src = project.url;
    embed.classList.remove('hidden');
    canvas.classList.add('hidden');
  }

  function hideEmbed() {
    embed.classList.add('hidden');
    embed.removeAttribute('src'); // stop the embedded page running in the background
    canvas.classList.remove('hidden');
  }

  function focusProject(project) {
    mode = 'focus';
    active = project;
    overlay.classList.add('hidden');
    backButton.classList.remove('hidden');

    if (project.kind === 'embed' && project.url) {
      showEmbed(project);
    } else {
      hideEmbed();
      pipeline.setScene(project.scene);
      if (reduceMotion) pipeline.render(true);
    }

    detail.replaceChildren(buildDetail(project));
    detail.classList.remove('hidden');
    status.textContent = `${project.title} open.`;
    detail.focus();
  }

  // `message` overrides the default announcement (used for "no such
  // project"). A grid -> grid re-entry — which happens when a bad slug
  // redirects — announces nothing, so it can't stomp that message.
  function showGrid(message) {
    const leavingFocus = mode === 'focus';
    mode = 'grid';
    active = null;
    hideEmbed();
    overlay.classList.remove('hidden');
    backButton.classList.add('hidden');
    detail.classList.add('hidden');
    detail.replaceChildren();
    if (message) status.textContent = message;
    else if (leavingFocus || !announcedOnce) status.textContent = 'Gallery grid.';
    announcedOnce = true;
    measureCells();
    if (reduceMotion) pipeline.renderGrid(cellRects, true);
    if (lastTile) {
      lastTile.focus();
      lastTile = null;
    }
  }

  // Clicks only change the URL; the route handler is the single place
  // that decides what is on screen.
  tiles.forEach((tile) => {
    tile.addEventListener('click', () => {
      lastTile = tile;
      setHash(tile.dataset.slug);
    });
  });
  backButton.addEventListener('click', () => setHash(null));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mode === 'focus') setHash(null);
  });

  onRoute((slug) => {
    if (!slug) {
      showGrid();
      return;
    }
    const project = findProject(slug);
    if (!project) {
      // Unknown slug: fall back to the grid and rewrite the URL in place
      // so Back doesn't return to a dead link. setHash re-enters this
      // handler with null, which renders the grid; the message is then
      // applied on top.
      setHash(null, { replace: true });
      showGrid(`No project named "${slug}".`);
      return;
    }
    focusProject(project);
  });

  window.addEventListener('resize', measureCells);
  measureCells();

  return {
    tick(frozen) {
      if (mode === 'grid') {
        pipeline.renderGrid(cellRects, frozen);
      } else if (active && active.kind !== 'embed') {
        pipeline.render(frozen);
      }
    },
  };
}
