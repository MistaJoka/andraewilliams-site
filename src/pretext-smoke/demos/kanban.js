import { prepare, layout } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import {
  KANBAN_FONT,
  KANBAN_COMPACT_FONT,
  TITLE_LINE_HEIGHT,
  BODY_LINE_HEIGHT,
} from '../shared/fonts.js';

const LEAD =
  'Lead: Miami property manager wants recurring landscaping quote and monthly billing';

export function mountKanban(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: Kanban cards fail when text grows — predict failure before the CRM UI breaks.</p>
    <div class="lab-controls">
      <label class="lab-control">Card text
        <textarea id="kb-text">${LEAD}</textarea>
      </label>
      <label class="lab-control">Card width (px)
        <input type="range" id="kb-width" min="160" max="360" value="240" />
        <span id="kb-width-val">240px</span>
      </label>
      <label class="lab-control">Mode
        <select id="kb-mode">
          <option value="full">Full</option>
          <option value="compact">Compact</option>
          <option value="mobile">Mobile card</option>
        </select>
      </label>
      <label class="lab-control">Max title lines
        <input type="range" id="kb-max" min="1" max="4" value="2" />
        <span id="kb-max-val">2</span>
      </label>
    </div>
    <div class="lab-card-preview" id="kb-card">
      <p class="lab-card-preview-title" id="kb-preview"></p>
    </div>
    <div id="kb-status"></div>
    <pre class="lab-output" id="kb-out"></pre>
  `;

  const textInput = root.querySelector('#kb-text');
  const widthSlider = root.querySelector('#kb-width');
  const modeSelect = root.querySelector('#kb-mode');
  const maxSlider = root.querySelector('#kb-max');
  const preview = root.querySelector('#kb-preview');
  const statusEl = root.querySelector('#kb-status');
  const out = root.querySelector('#kb-out');
  const card = root.querySelector('#kb-card');

  function fontForMode(mode) {
    if (mode === 'compact') return KANBAN_COMPACT_FONT;
    return KANBAN_FONT;
  }

  function lineHeightForMode(mode) {
    if (mode === 'compact') return 18;
    if (mode === 'mobile') return 20;
    return TITLE_LINE_HEIGHT;
  }

  function run() {
    const text = textInput.value;
    let width = Number(widthSlider.value);
    const mode = modeSelect.value;
    const maxLines = Number(maxSlider.value);

    if (mode === 'mobile') width = Math.min(width, 200);
    root.querySelector('#kb-width-val').textContent = `${width}px`;
    root.querySelector('#kb-max-val').textContent = String(maxLines);

    const font = fontForMode(mode);
    const lineHeight = lineHeightForMode(mode);
    const prepared = prepare(text, font);

    const t0 = performance.now();
    const result = layout(prepared, width, lineHeight);
    const ms = (performance.now() - t0).toFixed(2);
    const overflow = result.lineCount > maxLines;

    preview.textContent = text;
    preview.style.font = font;
    preview.style.lineHeight = `${lineHeight}px`;
    card.style.maxWidth = `${width}px`;

    statusEl.innerHTML = overflow
      ? `<span class="lab-status lab-status--risk">OVERFLOW RISK · ${result.lineCount}/${maxLines} lines</span>`
      : `<span class="lab-status lab-status--safe">SAFE · ${result.lineCount}/${maxLines} lines</span>`;

    out.textContent =
      `Mode: ${mode}\n` +
      `Font: ${font}\n` +
      `Lines: ${result.lineCount} / ${maxLines}\n` +
      `Height: ${result.height}px\n` +
      `Status: ${overflow ? 'OVERFLOW RISK' : 'SAFE'}\n` +
      `Layout: ${ms}ms`;

    updateHud({ width, lines: result.lineCount, height: result.height, ms });
  }

  root.querySelectorAll('input, textarea, select').forEach((el) => {
    el.addEventListener('input', run);
    el.addEventListener('change', run);
  });
  run();
}
