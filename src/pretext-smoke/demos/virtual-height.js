import { prepare, layout } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { TITLE_FONT, TITLE_LINE_HEIGHT } from '../shared/fonts.js';
import { bindRange } from '../shared/ui.js';

const ESTIMATE_HEIGHT = 48;

const TITLES = Array.from({ length: 50 }, (_, i) => {
  const bases = [
    'Kanban lead follow-up',
    'Property manager recurring quote',
    'Landscaping monthly billing setup',
    'Emergency roof repair estimate',
    'HOA board meeting action items',
  ];
  return `${bases[i % bases.length]} — ticket #${1000 + i} with extra context that may wrap`;
});

export function mountVirtualHeight(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: virtual lists need exact row heights before render. Batch prepare() + layout() sums scroll extent in microseconds — no DOM reads, no scroll jump.</p>
    <div class="lab-controls">
      <div class="lab-control-row">
        <label class="lab-control">Card width (px)
          <input type="range" id="vh-width" min="200" max="400" value="300" />
          <span id="vh-width-val">300px</span>
        </label>
        <label class="lab-control">Items
          <input type="range" id="vh-count" min="10" max="50" value="50" />
          <span id="vh-count-val">50</span>
        </label>
        <label class="lab-control">Mode
          <select id="vh-mode">
            <option value="exact">Pretext exact heights</option>
            <option value="estimate">Fixed estimate (bad)</option>
          </select>
        </label>
      </div>
    </div>
    <div class="lab-compare">
      <div class="lab-compare-col" style="grid-column:1/-1">
        <h3>Virtual feed viewport</h3>
        <div class="vlist-viewport" id="vh-viewport">
          <div class="vlist-inner" id="vh-inner"></div>
        </div>
      </div>
    </div>
    <dl class="lab-metrics" id="vh-metrics"></dl>
    <pre class="lab-output" id="vh-out"></pre>
  `;

  const widthSlider = root.querySelector('#vh-width');
  const countSlider = root.querySelector('#vh-count');
  const modeSelect = root.querySelector('#vh-mode');
  const inner = root.querySelector('#vh-inner');
  const metricsEl = root.querySelector('#vh-metrics');
  const out = root.querySelector('#vh-out');

  const prepared = TITLES.map((t) => prepare(t, TITLE_FONT));

  bindRange(widthSlider, root.querySelector('#vh-width-val'));
  bindRange(countSlider, root.querySelector('#vh-count-val'), (v) => String(v));

  function run() {
    const width = Number(widthSlider.value);
    const count = Number(countSlider.value);
    const useEstimate = modeSelect.value === 'estimate';

    const t0 = performance.now();
    const heights = [];
    let totalHeight = 0;
    let maxLines = 0;

    for (let i = 0; i < count; i++) {
      const result = layout(prepared[i], width, TITLE_LINE_HEIGHT);
      const h = useEstimate ? ESTIMATE_HEIGHT : result.height;
      heights.push({ h, exact: result.height, lines: result.lineCount, title: TITLES[i] });
      totalHeight += h;
      maxLines = Math.max(maxLines, result.lineCount);
    }
    const ms = (performance.now() - t0).toFixed(2);

    inner.style.height = `${totalHeight}px`;
    inner.replaceChildren();

    let y = 0;
    heights.forEach((row, i) => {
      const el = document.createElement('div');
      el.className = `vlist-row ${useEstimate && row.h !== row.exact ? 'is-estimate' : 'is-exact'}`;
      el.style.top = `${y}px`;
      el.style.height = `${row.h}px`;
      el.textContent = row.title;
      inner.appendChild(el);
      y += row.h;
    });

    const exactTotal = heights.reduce((s, r) => s + r.exact, 0);
    const drift = Math.abs(totalHeight - exactTotal);

    metricsEl.innerHTML = `
      <div class="lab-metrics-row"><dt>Items</dt><dd>${count}</dd></div>
      <div class="lab-metrics-row"><dt>Scroll extent</dt><dd>${totalHeight}px</dd></div>
      <div class="lab-metrics-row"><dt>Exact extent</dt><dd>${exactTotal}px</dd></div>
      <div class="lab-metrics-row"><dt>Scroll drift</dt><dd>${useEstimate ? `${drift}px (jump risk)` : '0px'}</dd></div>
      <div class="lab-metrics-row"><dt>Batch layout</dt><dd>${ms}ms · 0 DOM reads</dd></div>
    `;

    out.textContent =
      `Mode: ${useEstimate ? 'fixed estimate' : 'Pretext exact'}\n` +
      `Items: ${count}\n` +
      `Total scroll: ${totalHeight}px\n` +
      `Exact total: ${exactTotal}px\n` +
      `Drift: ${drift}px\n` +
      `Max lines/item: ${maxLines}\n` +
      `Batch: ${ms}ms`;

    updateHud({ width, lines: maxLines, height: totalHeight, ms });
  }

  widthSlider.addEventListener('input', run);
  countSlider.addEventListener('input', run);
  modeSelect.addEventListener('change', run);
  run();
}
