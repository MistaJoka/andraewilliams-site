import { AsciiPipeline } from './ascii-pipeline.js';

// Drives the gallery section's canvas: a grid of all scenes rendered as
// viewports into one shared WebGL context, or a single scene fullscreen
// ("focus" mode) after a tile is clicked. Reuses AsciiPipeline as-is —
// no separate rendering path, no extra WebGL contexts.
export function initGalleryView(canvas, overlayEl, backButton, scenes, { bgColor, reduceMotion = false } = {}) {
  let pipeline;
  try {
    pipeline = new AsciiPipeline(canvas, scenes, { bgColor });
  } catch (err) {
    console.warn('Gallery pipeline unavailable:', err);
    return null;
  }

  const tiles = Array.from(overlayEl.querySelectorAll('.gallery-tile'));
  let mode = 'grid';
  let cellRects = [];

  function measureCells() {
    const canvasRect = canvas.getBoundingClientRect();
    cellRects = tiles.map((tile) => {
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

  function focusScene(name) {
    mode = 'focus';
    pipeline.setScene(name);
    overlayEl.classList.add('hidden');
    backButton.classList.remove('hidden');
    if (reduceMotion) pipeline.render(true);
  }

  function showGrid() {
    mode = 'grid';
    overlayEl.classList.remove('hidden');
    backButton.classList.add('hidden');
    if (reduceMotion) pipeline.renderGrid(cellRects, true);
  }

  tiles.forEach((tile) => {
    tile.addEventListener('click', () => focusScene(tile.dataset.scene));
  });
  backButton.addEventListener('click', showGrid);

  window.addEventListener('resize', measureCells);
  measureCells();

  return {
    tick(frozen) {
      if (mode === 'grid') {
        pipeline.renderGrid(cellRects, frozen);
      } else {
        pipeline.render(frozen);
      }
    },
  };
}
