// Command-deck runtime: Zulu clock, reduced-motion gate, keyboard rail nav.
// All DOM lookups are guarded so this is safe on any deck page.

const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');

function applyMotion(reduced) {
  document.documentElement.dataset.motion = reduced ? 'reduce' : '';
}
applyMotion(reduceMq.matches);
if (reduceMq.addEventListener) {
  reduceMq.addEventListener('change', (event) => applyMotion(event.matches));
}

const clock = document.querySelector('#deck-clock');
function tick() {
  if (clock) clock.textContent = new Date().toISOString().slice(11, 19);
}
tick();
if (!reduceMq.matches) {
  setInterval(tick, 1000);
}

// Keyboard rail nav: h / a / t jump between primary destinations.
const DEST = { h: 'index.html', a: 'about.html', t: 'tools.html' };
document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const tag = (event.target && event.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const target = DEST[event.key.toLowerCase()];
  if (target && !location.pathname.endsWith(target)) {
    location.href = target;
  }
});
