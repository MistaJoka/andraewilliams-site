/**
 * Ambient smoke behind .app-layout; toggled via #smoke-toggle (home page only).
 */
import { createSmokeController, defaultSmokeParams } from './smoke-engine.js';

function init() {
  const toggle = document.getElementById('smoke-toggle');
  if (!toggle) return;

  const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');

  const grid = document.querySelector('.grid-overlay');
  const canvas = document.createElement('canvas');
  canvas.className = 'smoke-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  if (grid) grid.insertAdjacentElement('afterend', canvas);
  else document.body.prepend(canvas);

  const params = defaultSmokeParams();
  const controller = createSmokeController(canvas, {
    getParams: () => params,
    getCssSize: () => ({ width: window.innerWidth, height: window.innerHeight }),
    hideWhenStopped: true,
  });

  function applyReducedState() {
    if (reducedMq.matches) {
      controller.stop();
      toggle.setAttribute('aria-pressed', 'false');
      toggle.disabled = true;
      toggle.setAttribute('aria-disabled', 'true');
      toggle.title = 'Smoke animation is off when reduced motion is preferred.';
    } else {
      toggle.disabled = false;
      toggle.removeAttribute('aria-disabled');
      toggle.removeAttribute('title');
    }
  }

  toggle.addEventListener('click', () => {
    if (reducedMq.matches) return;
    const on = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(on));
    if (on) controller.start();
    else controller.stop();
  });

  window.addEventListener('resize', () => {
    controller.onResize();
  });

  reducedMq.addEventListener('change', applyReducedState);
  applyReducedState();
}

document.addEventListener('DOMContentLoaded', init);
