import { prepare, layout } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { BODY_FONT, BODY_LINE_HEIGHT } from '../shared/fonts.js';
import { bindRange } from '../shared/ui.js';

const DEFAULT_TEXT =
  'andraewilliams.com — Pretext measures this paragraph without DOM layout thrash. ' +
  'Drag the width slider: layout() re-runs instantly while prepare() stays cached. '.repeat(2);

const SWEEP_WIDTHS = [160, 200, 240, 280, 320, 360, 400, 440, 480];

export function mountWidthStress(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: prepare() once, then cheap layout() on every width change — the core Pretext loop for responsive UI.</p>
    <div class="lab-controls">
      <label class="lab-control">Width (px)
        <input type="range" id="ws-width" min="160" max="560" value="360" />
        <span id="ws-width-val">360px</span>
      </label>
    </div>
    <div class="lab-stage">
      <p class="lab-stage-label">Live paragraph + reserved height ghost</p>
      <div class="stress-preview-wrap" id="ws-wrap">
        <div class="stress-reserve-ghost" id="ws-ghost"></div>
        <p class="stress-preview-text" id="ws-text"></p>
      </div>
    </div>
    <dl class="lab-metrics" id="ws-metrics"></dl>
    <div class="lab-stage">
      <p class="lab-stage-label">Line count vs width (layout sweep)</p>
      <div class="stress-bars" id="ws-bars"></div>
      <div class="stress-bar-labels" id="ws-bar-labels"></div>
    </div>
    <pre class="lab-output" id="ws-out"></pre>
  `;

  const slider = root.querySelector('#ws-width');
  const wrap = root.querySelector('#ws-wrap');
  const ghost = root.querySelector('#ws-ghost');
  const textEl = root.querySelector('#ws-text');
  const metricsEl = root.querySelector('#ws-metrics');
  const barsEl = root.querySelector('#ws-bars');
  const barLabels = root.querySelector('#ws-bar-labels');
  const out = root.querySelector('#ws-out');

  const prepared = prepare(DEFAULT_TEXT, BODY_FONT);
  textEl.textContent = DEFAULT_TEXT;
  textEl.style.font = BODY_FONT;
  textEl.style.lineHeight = `${BODY_LINE_HEIGHT}px`;

  bindRange(slider, root.querySelector('#ws-width-val'));

  function run() {
    const maxWidth = Number(slider.value);

    const t0 = performance.now();
    const result = layout(prepared, maxWidth, BODY_LINE_HEIGHT);
    const ms = (performance.now() - t0).toFixed(3);

    wrap.style.width = `${maxWidth}px`;
    ghost.style.height = `${result.height}px`;
    textEl.style.maxWidth = `${maxWidth}px`;

    metricsEl.innerHTML = `
      <div class="lab-metrics-row"><dt>Width</dt><dd>${maxWidth}px</dd></div>
      <div class="lab-metrics-row"><dt>Lines</dt><dd>${result.lineCount}</dd></div>
      <div class="lab-metrics-row"><dt>Height</dt><dd>${result.height}px</dd></div>
      <div class="lab-metrics-row"><dt>layout() time</dt><dd>${ms}ms</dd></div>
      <div class="lab-metrics-row"><dt>prepare()</dt><dd>once (cached)</dd></div>
    `;

    const sweep = SWEEP_WIDTHS.map((w) => layout(prepared, w, BODY_LINE_HEIGHT).lineCount);
    const maxLines = Math.max(...sweep, 1);

    barsEl.replaceChildren();
    barLabels.replaceChildren();
    SWEEP_WIDTHS.forEach((w, i) => {
      const bar = document.createElement('div');
      bar.className = 'stress-bar';
      bar.style.height = `${(sweep[i] / maxLines) * 100}%`;
      bar.title = `${w}px → ${sweep[i]} lines`;
      if (w === maxWidth) bar.style.background = 'var(--primary)';
      barsEl.appendChild(bar);

      const lbl = document.createElement('span');
      lbl.textContent = String(w);
      barLabels.appendChild(lbl);
    });

    out.textContent = JSON.stringify(
      {
        maxWidthPx: maxWidth,
        lineHeightPx: BODY_LINE_HEIGHT,
        lineCount: result.lineCount,
        heightPx: result.height,
        layoutMs: ms,
        sweep: SWEEP_WIDTHS.map((w, i) => ({ width: w, lines: sweep[i] })),
      },
      null,
      2
    );

    updateHud({ width: maxWidth, lines: result.lineCount, height: result.height, ms });
  }

  slider.addEventListener('input', run);
  run();
}
