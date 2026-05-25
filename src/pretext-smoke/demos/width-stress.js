import { prepare, layout } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { BODY_FONT, BODY_LINE_HEIGHT } from '../shared/fonts.js';

const DEFAULT_TEXT =
  'andraewilliams.com — Pretext measures this paragraph without DOM layout thrash. ' +
  'Resize the width slider and watch layout() re-run with the new width. '.repeat(2);

export function mountWidthStress(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: cheap re-layout when width changes — no DOM measurement, no reflow.</p>
    <div class="lab-controls">
      <label class="lab-control">Width (px)
        <input type="range" id="ws-width" min="160" max="560" value="360" />
        <span id="ws-width-val">360px</span>
      </label>
    </div>
    <pre class="lab-output" id="ws-out">Measuring…</pre>
  `;

  const slider = root.querySelector('#ws-width');
  const out = root.querySelector('#ws-out');
  const val = root.querySelector('#ws-width-val');
  const prepared = prepare(DEFAULT_TEXT, BODY_FONT);

  function run() {
    const t0 = performance.now();
    const maxWidth = Number(slider.value);
    const result = layout(prepared, maxWidth, BODY_LINE_HEIGHT);
    const ms = (performance.now() - t0).toFixed(2);
    val.textContent = `${maxWidth}px`;
    out.textContent = JSON.stringify(
      {
        maxWidthPx: maxWidth,
        lineHeightPx: BODY_LINE_HEIGHT,
        lineCount: result.lineCount,
        heightPx: result.height,
        font: BODY_FONT,
        layoutMs: ms,
      },
      null,
      2
    );
    updateHud({ width: maxWidth, lines: result.lineCount, height: result.height, ms });
  }

  slider.addEventListener('input', run);
  run();
}
