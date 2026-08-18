import { AsciiPipeline } from './ascii-pipeline.js';
import { Gallery } from './gallery.js';
import { scenes } from './scenes.js';

function hexToRgbFloat(hex) {
  const c = hex.replace('#', '');
  return [
    parseInt(c.substring(0, 2), 16) / 255,
    parseInt(c.substring(2, 4), 16) / 255,
    parseInt(c.substring(4, 6), 16) / 255,
  ];
}

function init() {
  const canvas = document.getElementById('ascii-canvas');
  const fallback = document.getElementById('fallback-content');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let pipeline;
  try {
    pipeline = new AsciiPipeline(canvas, scenes, {
      bgColor: hexToRgbFloat('#070b12'),
    });
  } catch (err) {
    console.warn('ASCII pipeline unavailable, falling back to static content:', err);
    return;
  }

  canvas.classList.remove('hidden');
  if (fallback) fallback.classList.add('hidden');

  const sceneNames = Object.keys(scenes);
  const gallery = new Gallery(pipeline, sceneNames, { intervalMs: 12000, autoplay: !reduceMotion });
  gallery.start();

  window.addEventListener('resize', () => pipeline.resize());

  function loop() {
    pipeline.render(reduceMotion);
    if (!reduceMotion) requestAnimationFrame(loop);
  }
  loop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
