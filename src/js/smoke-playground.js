import { createSmokeController, defaultSmokeParams } from './smoke-engine.js';

function cloneDefaults() {
  const p = defaultSmokeParams();
  p.colorHue = 200;
  return p;
}

/** Virtual param: scales wobbleSpeedMin + wobbleSpeedRange together (original ratio). */
function setWobbleFromBase(params, base) {
  params.wobbleSpeedMin = base;
  params.wobbleSpeedRange = base * (0.028 / 0.018);
}

function getWobbleBase(params) {
  return params.wobbleSpeedMin;
}

function formatValue(key, value) {
  if (key === 'maxParticles' || key === 'colorHue') return String(Math.round(value));
  if (key === 'spawnPerFrame' || key === 'vyMin' || key === 'vyRange' || key === 'vxSpread')
    return value.toFixed(2);
  if (key === 'wobbleStrength') return value.toFixed(2);
  if (key === 'wobbleSpeedBase') return value.toFixed(3);
  if (key === 'radiusGrowth' || key === 'trailAlpha' || key === 'puffAlpha') return value.toFixed(2);
  if (key === 'maxLifeMin' || key === 'maxLifeRange') return String(Math.round(value));
  return String(value);
}

function init() {
  const viewport = document.getElementById('smoke-viewport');
  const canvas = document.getElementById('smoke-canvas-playground');
  const fieldset = document.getElementById('smoke-controls');
  const reducedMsg = document.getElementById('smoke-reduced-msg');
  const resetBtn = document.getElementById('smoke-reset');
  if (!viewport || !canvas || !fieldset) return;

  const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let params = cloneDefaults();
  setWobbleFromBase(params, params.wobbleSpeedMin);

  const controller = createSmokeController(canvas, {
    getParams: () => params,
    getCssSize: () => ({
      width: viewport.clientWidth,
      height: viewport.clientHeight,
    }),
    hideWhenStopped: false,
  });

  function applyInputsFromParams() {
    for (const input of fieldset.querySelectorAll('input[data-param]')) {
      const key = input.dataset.param;
      if (key === 'wobbleSpeedBase') {
        input.value = String(getWobbleBase(params));
      } else {
        input.value = String(params[key]);
      }
    }
    for (const el of document.querySelectorAll('[data-for]')) {
      const key = el.dataset.for;
      if (key === 'wobbleSpeedBase') {
        el.textContent = formatValue(key, getWobbleBase(params));
      } else {
        el.textContent = formatValue(key, params[key]);
      }
    }
  }

  function readInputsToParams() {
    for (const input of fieldset.querySelectorAll('input[data-param]')) {
      const key = input.dataset.param;
      const v = parseFloat(input.value);
      if (key === 'wobbleSpeedBase') {
        setWobbleFromBase(params, v);
      } else {
        params[key] = v;
      }
    }
    for (const el of document.querySelectorAll('[data-for]')) {
      const key = el.dataset.for;
      if (key === 'wobbleSpeedBase') {
        el.textContent = formatValue(key, getWobbleBase(params));
      } else {
        el.textContent = formatValue(key, params[key]);
      }
    }
  }

  fieldset.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || !t.dataset.param) return;
    readInputsToParams();
  });

  resetBtn?.addEventListener('click', () => {
    params = cloneDefaults();
    setWobbleFromBase(params, params.wobbleSpeedMin);
    applyInputsFromParams();
  });

  function applyReduced() {
    if (reducedMq.matches) {
      controller.stop();
      canvas.hidden = true;
      reducedMsg.hidden = false;
      fieldset.disabled = true;
      if (resetBtn) resetBtn.disabled = true;
    } else {
      reducedMsg.hidden = true;
      canvas.hidden = false;
      fieldset.disabled = false;
      if (resetBtn) resetBtn.disabled = false;
      if (!controller.running) controller.start();
    }
  }

  const ro = new ResizeObserver(() => {
    controller.onResize();
  });
  ro.observe(viewport);

  applyInputsFromParams();
  reducedMq.addEventListener('change', applyReduced);
  applyReduced();
}

document.addEventListener('DOMContentLoaded', init);
