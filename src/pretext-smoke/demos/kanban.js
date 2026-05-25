import { prepare, layout } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { interFont, lineHeightForSize } from '../shared/fonts.js';
import { bindRange, statusBadge } from '../shared/ui.js';

const LEAD =
  'Lead: Miami property manager wants recurring landscaping quote and monthly billing';

export function mountKanban(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: Kanban cards fail when CRM copy grows — predict line count and height before the board renders. Good money skill for workflow UI.</p>
    <div class="lab-controls">
      <label class="lab-control">Card text
        <textarea id="kb-text" rows="3">${LEAD}</textarea>
      </label>
      <div class="lab-control-row">
        <label class="lab-control">Card width (px)
          <input type="range" id="kb-width" min="160" max="360" value="240" />
          <span id="kb-width-val">240px</span>
        </label>
        <label class="lab-control">Font size (px)
          <input type="range" id="kb-font" min="11" max="18" value="14" />
          <span id="kb-font-val">14px</span>
        </label>
        <label class="lab-control">Max title lines
          <input type="range" id="kb-max" min="1" max="4" value="2" />
          <span id="kb-max-val">2</span>
        </label>
        <label class="lab-control">Mode
          <select id="kb-mode">
            <option value="full">Full card</option>
            <option value="compact">Compact</option>
            <option value="mobile">Mobile card</option>
          </select>
        </label>
      </div>
    </div>
    <div class="kanban-board">
      <div class="kanban-column">
        <div class="kanban-col-head"><span>New leads</span><span>3</span></div>
        <div class="kanban-card" id="kb-card">
          <div class="kanban-card-label">CRM · Lead</div>
          <p class="kanban-card-title" id="kb-preview"></p>
          <div class="kanban-card-meta">
            <span class="kanban-chip">landscaping</span>
            <span class="kanban-chip">recurring</span>
          </div>
        </div>
      </div>
      <div class="kanban-column" aria-hidden="true">
        <div class="kanban-col-head"><span>Quoted</span><span>2</span></div>
        <div class="kanban-card" style="opacity:0.45"><p class="kanban-card-title" style="font-size:13px">HOA mulch refresh — waiting on approval</p></div>
      </div>
    </div>
    <div id="kb-status" style="margin-top:0.75rem"></div>
    <pre class="lab-output" id="kb-out"></pre>
  `;

  const textInput = root.querySelector('#kb-text');
  const widthSlider = root.querySelector('#kb-width');
  const fontSlider = root.querySelector('#kb-font');
  const maxSlider = root.querySelector('#kb-max');
  const modeSelect = root.querySelector('#kb-mode');
  const preview = root.querySelector('#kb-preview');
  const card = root.querySelector('#kb-card');
  const statusEl = root.querySelector('#kb-status');
  const out = root.querySelector('#kb-out');

  bindRange(widthSlider, root.querySelector('#kb-width-val'));
  bindRange(fontSlider, root.querySelector('#kb-font-val'));
  bindRange(maxSlider, root.querySelector('#kb-max-val'), (v) => String(v));

  function effectiveWidth(mode, width) {
    if (mode === 'mobile') return Math.min(width, 200);
    if (mode === 'compact') return Math.min(width, 200);
    return width;
  }

  function fontSizeForMode(mode, base) {
    if (mode === 'compact') return Math.max(11, base - 2);
    return base;
  }

  function run() {
    const text = textInput.value;
    const mode = modeSelect.value;
    const fontSize = fontSizeForMode(mode, Number(fontSlider.value));
    const width = effectiveWidth(mode, Number(widthSlider.value));
    const maxLines = Number(maxSlider.value);
    const font = interFont(500, fontSize);
    const lineHeight = lineHeightForSize(fontSize);

    const prepared = prepare(text, font);
    const t0 = performance.now();
    const result = layout(prepared, width, lineHeight);
    const ms = (performance.now() - t0).toFixed(2);
    const overflow = result.lineCount > maxLines;

    preview.textContent = text;
    preview.style.font = font;
    preview.style.lineHeight = `${lineHeight}px`;
    preview.style.maxHeight = `${maxLines * lineHeight}px`;
    preview.style.overflow = 'hidden';
    card.style.maxWidth = `${width}px`;
    card.classList.toggle('is-overflow', overflow);

    statusEl.innerHTML = statusBadge(
      overflow,
      `${result.lineCount}/${maxLines} lines · ${mode}`
    );

    out.textContent =
      `Mode: ${mode}\n` +
      `Font: ${font}\n` +
      `Card width: ${width}px\n` +
      `Title lines: ${result.lineCount} / ${maxLines}\n` +
      `Height: ${result.height}px\n` +
      `Status: ${overflow ? 'OVERFLOW RISK' : 'SAFE'}\n` +
      `Layout: ${ms}ms · DOM reads: 0`;

    updateHud({ width, lines: result.lineCount, height: result.height, ms });
  }

  root.querySelectorAll('input, textarea, select').forEach((el) => {
    el.addEventListener('input', run);
    el.addEventListener('change', run);
  });
  run();
}
