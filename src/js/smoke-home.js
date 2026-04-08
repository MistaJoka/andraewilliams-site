/**
 * Ambient smoke behind .app-layout; toggled via #smoke-toggle (home page only).
 */
const MAX_PARTICLES = 72;
const SPAWN_PER_FRAME = 1.15;

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

  const ctx = canvas.getContext('2d');
  let dpr = 1;
  let cssW = 0;
  let cssH = 0;
  let running = false;
  let rafId = 0;
  let spawnAcc = 0;
  const particles = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = window.innerWidth;
    cssH = window.innerHeight;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn() {
    const band = cssW * 0.88;
    const x = cssW * 0.06 + Math.random() * band;
    const y = cssH + 24 + Math.random() * 48;
    particles.push({
      x,
      y,
      vy: -(1.1 + Math.random() * 1.9),
      vx: (Math.random() - 0.5) * 0.4,
      r: 10 + Math.random() * 20,
      maxLife: 110 + Math.random() * 95,
      life: 0,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.018 + Math.random() * 0.028,
    });
  }

  function step() {
    if (!running) return;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(10, 10, 15, 0.14)';
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.globalCompositeOperation = 'lighter';

    spawnAcc += SPAWN_PER_FRAME;
    while (spawnAcc >= 1 && particles.length < MAX_PARTICLES) {
      spawn();
      spawnAcc -= 1;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += 1;
      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * 0.5;
      p.y += p.vy;
      p.vy *= 0.997;
      p.r += 0.11;

      const t = p.life / p.maxLife;
      if (t >= 1) {
        particles.splice(i, 1);
        continue;
      }

      const alpha = (1 - t) * (1 - t) * 0.085;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(175, 205, 215, ${alpha * 1.15})`);
      g.addColorStop(0.45, `rgba(110, 155, 170, ${alpha * 0.55})`);
      g.addColorStop(1, 'rgba(70, 95, 110, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (running || reducedMq.matches) return;
    running = true;
    canvas.style.display = 'block';
    resize();
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.restore();
    spawnAcc = 0;
    for (let i = 0; i < 18; i++) spawn();
    step();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
    particles.length = 0;
    spawnAcc = 0;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    canvas.style.display = 'none';
  }

  function applyReducedState() {
    if (reducedMq.matches) {
      stop();
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
    if (on) start();
    else stop();
  });

  window.addEventListener('resize', () => {
    if (running) resize();
  });

  reducedMq.addEventListener('change', applyReducedState);
  applyReducedState();
}

document.addEventListener('DOMContentLoaded', init);
