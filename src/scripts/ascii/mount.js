// Replaces the old main.js + gallery.js + gallery-view.js. Those drove a
// single unconditional requestAnimationFrame loop for the whole page;
// with several demos across a multi-page site that would run forever,
// off-screen and in background tabs. This starts on demand and stops the
// moment the canvas is not visible.

export function mount(stage, AsciiPipeline, scenes, { bgColor, ramp, reduce = false } = {}) {
  const canvas = stage.querySelector('canvas');
  const scene = stage.dataset.scene;
  if (!canvas || !scene || !scenes[scene]) return null;

  let pipeline;
  try {
    pipeline = new AsciiPipeline(canvas, scenes, { bgColor, ramp });
  } catch (err) {
    // No WebGL: leave the static description in place rather than showing
    // a blank canvas or throwing.
    console.warn('ASCII pipeline unavailable:', err);
    stage.dataset.state = 'unavailable';
    return null;
  }

  pipeline.setScene(scene);
  canvas.hidden = false;
  // Size the drawing buffer to the element before the first frame, or the
  // canvas stays at its default 300x150 and renders at the wrong scale.
  pipeline.resize();
  stage.dataset.state = 'running';

  // Reduced motion: render exactly one frame and never start the loop.
  if (reduce) {
    pipeline.render(true);
    stage.dataset.state = 'static';
    return { stop() {} };
  }

  let raf = 0;
  let onScreen = true;
  const tick = () => {
    pipeline.render(false);
    raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

  // Start now. The observer below only pauses and resumes — it is an
  // optimisation, never the thing that delivers the first frame.
  start();

  const io = new IntersectionObserver(
    ([entry]) => { onScreen = entry.isIntersecting; onScreen && !document.hidden ? start() : stop(); },
    { threshold: 0.01 },
  );
  io.observe(stage);

  const onVisibility = () => (document.hidden || !onScreen ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  const ro = new ResizeObserver(() => pipeline.resize());
  ro.observe(stage);

  return {
    stop() {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
