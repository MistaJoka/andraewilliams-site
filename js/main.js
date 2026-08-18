import { AsciiPipeline } from './ascii-pipeline.js';
import { Gallery } from './gallery.js';
import { initGalleryView } from './gallery-view.js';
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
  const heroCanvas = document.getElementById('ascii-canvas');
  const fallback = document.getElementById('fallback-content');
  const galleryCanvas = document.getElementById('gallery-canvas');
  const galleryOverlay = document.getElementById('gallery-grid-overlay');
  const galleryBack = document.getElementById('gallery-back');
  const gallerySection = document.getElementById('gallery-section');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bgColor = hexToRgbFloat('#070b12');

  let heroPipeline = null;
  if (heroCanvas) {
    try {
      heroPipeline = new AsciiPipeline(heroCanvas, scenes, { bgColor });
      heroCanvas.classList.remove('hidden');
      if (fallback) fallback.classList.add('hidden');
    } catch (err) {
      console.warn('Hero ASCII pipeline unavailable, falling back to static content:', err);
    }
  }

  let heroGallery = null;
  if (heroPipeline) {
    const sceneNames = Object.keys(scenes);
    heroGallery = new Gallery(heroPipeline, sceneNames, { intervalMs: 12000, autoplay: !reduceMotion });
    heroGallery.start();
  }

  let galleryView = null;
  if (galleryCanvas && galleryOverlay && galleryBack) {
    galleryView = initGalleryView(galleryCanvas, galleryOverlay, galleryBack, scenes, { bgColor, reduceMotion });
    if (!galleryView && gallerySection) gallerySection.classList.add('hidden');
  }

  window.addEventListener('resize', () => {
    if (heroPipeline) heroPipeline.resize();
  });

  function loop() {
    if (heroPipeline) heroPipeline.render(reduceMotion);
    if (galleryView) galleryView.tick(reduceMotion);
    if (!reduceMotion) requestAnimationFrame(loop);
  }
  loop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
