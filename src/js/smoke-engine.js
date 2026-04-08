/**
 * Shared canvas smoke particle loop. Params are read each frame from getParams().
 */

export function defaultSmokeParams() {
  return {
    maxParticles: 72,
    spawnPerFrame: 1.15,
    spawnBand: 0.88,
    spawnXInset: 0.06,
    spawnBelowMin: 24,
    spawnBelowRandom: 48,
    vyMin: 1.1,
    vyRange: 1.9,
    vxSpread: 0.4,
    radiusMin: 10,
    radiusRange: 20,
    maxLifeMin: 110,
    maxLifeRange: 95,
    wobbleSpeedMin: 0.018,
    wobbleSpeedRange: 0.028,
    wobbleStrength: 0.5,
    vyDamping: 0.997,
    radiusGrowth: 0.11,
    trailR: 10,
    trailG: 10,
    trailB: 15,
    trailAlpha: 0.14,
    puffAlpha: 0.085,
    /** If set, puff uses hsla stops tinted by this hue; if null, uses RGB below (home default). */
    colorHue: null,
    puffInnerRgb: [175, 205, 215],
    puffMidRgb: [110, 155, 170],
    puffOuterRgb: [70, 95, 110],
    initialSpawnCount: 18,
  };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} options
 * @param {() => object} options.getParams
 * @param {() => { width: number, height: number }} options.getCssSize
 * @param {boolean} [options.hideWhenStopped] - set display none when stopped (home overlay)
 */
export function createSmokeController(canvas, options) {
  const { getParams, getCssSize, hideWhenStopped = false } = options;
  const ctx = canvas.getContext('2d');
  let dpr = 1;
  let cssW = 0;
  let cssH = 0;
  let running = false;
  let rafId = 0;
  let spawnAcc = 0;
  const particles = [];

  function resize() {
    const { width, height } = getCssSize();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = Math.max(1, Math.floor(width));
    cssH = Math.max(1, Math.floor(height));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn() {
    const p = getParams();
    const band = cssW * p.spawnBand;
    const x = cssW * p.spawnXInset + Math.random() * band;
    const y = cssH + p.spawnBelowMin + Math.random() * p.spawnBelowRandom;
    particles.push({
      x,
      y,
      vy: -(p.vyMin + Math.random() * p.vyRange),
      vx: (Math.random() - 0.5) * p.vxSpread,
      r: p.radiusMin + Math.random() * p.radiusRange,
      maxLife: p.maxLifeMin + Math.random() * p.maxLifeRange,
      life: 0,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: p.wobbleSpeedMin + Math.random() * p.wobbleSpeedRange,
    });
  }

  function step() {
    if (!running) return;

    const p = getParams();

    while (particles.length > p.maxParticles) {
      particles.shift();
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(${p.trailR}, ${p.trailG}, ${p.trailB}, ${p.trailAlpha})`;
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.globalCompositeOperation = 'lighter';

    spawnAcc += p.spawnPerFrame;
    while (spawnAcc >= 1 && particles.length < p.maxParticles) {
      spawn();
      spawnAcc -= 1;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.life += 1;
      q.wobble += q.wobbleSpeed;
      q.x += q.vx + Math.sin(q.wobble) * p.wobbleStrength;
      q.y += q.vy;
      q.vy *= p.vyDamping;
      q.r += p.radiusGrowth;

      const t = q.life / q.maxLife;
      if (t >= 1) {
        particles.splice(i, 1);
        continue;
      }

      const alpha = (1 - t) * (1 - t) * p.puffAlpha;
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
      if (p.colorHue == null) {
        const [ir, ig, ib] = p.puffInnerRgb;
        const [mr, mg, mb] = p.puffMidRgb;
        const [or, og, ob] = p.puffOuterRgb;
        g.addColorStop(0, `rgba(${ir}, ${ig}, ${ib}, ${alpha * 1.15})`);
        g.addColorStop(0.45, `rgba(${mr}, ${mg}, ${mb}, ${alpha * 0.55})`);
        g.addColorStop(1, `rgba(${or}, ${og}, ${ob}, 0)`);
      } else {
        const h = p.colorHue;
        g.addColorStop(0, `hsla(${h}, 42%, 74%, ${alpha * 1.15})`);
        g.addColorStop(0.45, `hsla(${h + 18}, 48%, 58%, ${alpha * 0.55})`);
        g.addColorStop(1, `hsla(${h + 32}, 35%, 42%, 0)`);
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    running = true;
    if (hideWhenStopped) canvas.style.display = 'block';
    resize();
    const p = getParams();
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.restore();
    spawnAcc = 0;
    const n = Math.min(p.initialSpawnCount, p.maxParticles);
    for (let i = 0; i < n; i++) spawn();
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
    if (hideWhenStopped) canvas.style.display = 'none';
  }

  function onResize() {
    if (running) resize();
  }

  return {
    start,
    stop,
    get running() {
      return running;
    },
    onResize,
  };
}
