import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { BODY_FONT, BODY_LINE_HEIGHT } from '../shared/fonts.js';

const DEFAULT =
  'Manual line layout: each line string comes from layoutWithLines() for canvas, SVG, or custom DOM layers.';

export function mountManualLines(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: Tier-2 API — you own each line, not just total height.</p>
    <div class="lab-controls">
      <label class="lab-control">Width (px)
        <input type="range" id="ml-width" min="160" max="480" value="320" />
        <span id="ml-width-val">320px</span>
      </label>
      <label class="lab-control">Text
        <textarea id="ml-text">${DEFAULT}</textarea>
      </label>
    </div>
    <ol class="lab-line-list" id="ml-lines"></ol>
    <pre class="lab-output" id="ml-out"></pre>
  `;

  const slider = root.querySelector('#ml-width');
  const textInput = root.querySelector('#ml-text');
  const list = root.querySelector('#ml-lines');
  const out = root.querySelector('#ml-out');

  function run() {
    const width = Number(slider.value);
    const text = textInput.value;
    root.querySelector('#ml-width-val').textContent = `${width}px`;

    const prepared = prepareWithSegments(text, BODY_FONT);
    const t0 = performance.now();
    const { lines, height, lineCount } = layoutWithLines(prepared, width, BODY_LINE_HEIGHT);
    const ms = (performance.now() - t0).toFixed(2);

    list.replaceChildren();
    lines.forEach((line, i) => {
      const li = document.createElement('li');
      li.textContent = `${String(i + 1).padStart(2, '0')} · w${Math.round(line.width)} · ${line.text}`;
      list.appendChild(li);
    });

    out.textContent =
      lines.map((l, i) => `L${i + 1} (${Math.round(l.width)}px): ${l.text}`).join('\n') +
      `\n\nTotal: ${lineCount} lines, ${height}px, ${ms}ms`;

    updateHud({ width, lines: lineCount, height, ms });
  }

  slider.addEventListener('input', run);
  textInput.addEventListener('input', run);
  run();
}
