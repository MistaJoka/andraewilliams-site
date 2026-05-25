/** Demo registry — hash router mounts one panel at a time. */
import { mountWidthStress } from './demos/width-stress.js';
import { mountFitGuard } from './demos/fit-guard.js';
import { mountShrinkwrapGuard } from './demos/shrinkwrap-guard.js';
import { mountKanban } from './demos/kanban.js';
import { mountManualLines } from './demos/manual-lines.js';
import { mountI18nStress } from './demos/i18n-stress.js';
import { mountVirtualHeight } from './demos/virtual-height.js';
import { mountLayoutShift } from './demos/layout-shift.js';

export const DEMOS = [
  {
    id: 'width-stress',
    label: 'Width Stress',
    tagline: 'prepare() once, layout() on every resize',
    mount: mountWidthStress,
  },
  {
    id: 'fit-guard',
    label: 'Card Fit Guard',
    tagline: 'Line budgets vs overflow risk',
    mount: mountFitGuard,
  },
  {
    id: 'shrinkwrap',
    label: 'Shrinkwrap Guard',
    tagline: 'Tightest width for fixed line count',
    mount: mountShrinkwrapGuard,
  },
  {
    id: 'kanban',
    label: 'Kanban Intelligence',
    tagline: 'CRM card text prediction',
    mount: mountKanban,
  },
  {
    id: 'manual-lines',
    label: 'Manual Lines',
    tagline: 'layoutWithLines() output',
    mount: mountManualLines,
  },
  {
    id: 'i18n',
    label: 'Multilingual',
    tagline: 'Mixed-script wrapping matrix',
    mount: mountI18nStress,
  },
  {
    id: 'virtual-height',
    label: 'Virtual Height',
    tagline: 'Batch height estimation',
    mount: mountVirtualHeight,
  },
  {
    id: 'layout-shift',
    label: 'Layout Shift',
    tagline: 'Measure first vs jump later',
    mount: mountLayoutShift,
  },
];

let activeCleanup = null;

export function updateHud(stats = {}) {
  const hud = document.getElementById('lab-hud');
  if (!hud) return;
  const w = stats.width ?? '—';
  const lines = stats.lines ?? '—';
  const height = stats.height ?? '—';
  const ms = stats.ms ?? '—';
  hud.innerHTML =
    `<span>Width: <strong>${w}</strong>px</span>` +
    `<span>Lines: <strong>${lines}</strong></span>` +
    `<span>Height: <strong>${height}</strong>px</span>` +
    `<span>Reflow: <strong>${ms}</strong>ms</span>` +
    `<span>DOM reads: <strong>0</strong></span>`;
}

function mountDemo(demoId) {
  const root = document.getElementById('demo-root');
  if (!root) return;

  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }

  const demo = DEMOS.find((d) => d.id === demoId) || DEMOS[0];
  root.replaceChildren();

  const heading = document.createElement('div');
  heading.className = 'lab-demo-head';
  heading.innerHTML = `
    <h2 class="lab-demo-title">${demo.label}</h2>
    <p class="lab-demo-tagline">${demo.tagline}</p>
  `;
  root.appendChild(heading);

  const panel = document.createElement('div');
  panel.className = 'lab-demo-panel';
  panel.id = 'demo-panel';
  root.appendChild(panel);

  document.querySelectorAll('.lab-nav-link').forEach((link) => {
    const active = link.dataset.demo === demo.id;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const cleanup = demo.mount(panel);
  if (typeof cleanup === 'function') activeCleanup = cleanup;
}

function currentDemoId() {
  const hash = location.hash.replace(/^#/, '');
  if (DEMOS.some((d) => d.id === hash)) return hash;
  return DEMOS[0].id;
}

export function initRouter() {
  const nav = document.getElementById('lab-nav');
  if (nav) {
    DEMOS.forEach((demo) => {
      const link = document.createElement('a');
      link.href = `#${demo.id}`;
      link.className = 'lab-nav-link';
      link.dataset.demo = demo.id;
      link.textContent = demo.label;
      nav.appendChild(link);
    });
  }

  const go = () => mountDemo(currentDemoId());
  window.addEventListener('hashchange', go);
  go();
}
