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

// ELI5: the page claims it is tiny and image-free. Rather than hardcode a
// number that rots the next time a file grows, ask the browser what it
// actually downloaded and print that. If the timing API is unavailable
// (or blocked), the static fallback text in index.html stands.
function reportPageWeight() {
  const el = document.getElementById('page-weight');
  if (!el || !window.performance || !performance.getEntriesByType) return;

  const nav = performance.getEntriesByType('navigation')[0];
  const resources = performance.getEntriesByType('resource');
  // encodedBodySize = bytes on the wire (compressed), which is what
  // "over the wire" claims — not the uncompressed source size.
  let bytes = nav ? nav.encodedBodySize : 0;
  for (const r of resources) bytes += r.encodedBodySize || 0;
  if (!bytes) return; // some browsers report 0 rather than nothing; keep the fallback

  el.textContent = Math.round(bytes / 1024) + ' KB';
  el.title = resources.length + 1 + ' files, zero of them images';
}

function init() {
  const heroCanvas = document.getElementById('ascii-canvas');
  const fallback = document.getElementById('fallback-content');
  const gallerySection = document.getElementById('gallery-section');
  const galleryEls = {
    canvas: document.getElementById('gallery-canvas'),
    overlay: document.getElementById('gallery-grid-overlay'),
    backButton: document.getElementById('gallery-back'),
    embed: document.getElementById('project-embed'),
    detail: document.getElementById('project-detail'),
    status: document.getElementById('gallery-status'),
  };

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
  if (Object.values(galleryEls).every(Boolean)) {
    galleryView = initGalleryView(galleryEls, scenes, { bgColor, reduceMotion });
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

  // After load, so every request has a timing entry to count.
  if (document.readyState === 'complete') reportPageWeight();
  else window.addEventListener('load', reportPageWeight);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
