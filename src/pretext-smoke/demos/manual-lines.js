import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { BODY_FONT, BODY_LINE_HEIGHT } from '../shared/fonts.js';
import { bindRange } from '../shared/ui.js';

const DEFAULT =
  'Manual line layout: each line string comes from layoutWithLines() for canvas, SVG, or custom DOM layers. Resize width to reflow.';

export function mountManualLines(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: Tier-2 API — layoutWithLines() materializes each line for manual positioning (canvas, SVG, WebGL, custom DOM).</p>
    <div class="lab-controls">
      <label class="lab-control">Width (px)
        <input type="range" id="ml-width" min="160" max="480" value="320" />
        <span id="ml-width-val">320px</span>
      </label>
      <label class="lab-control">Text
        <textarea id="ml-text" rows="3">${DEFAULT}</textarea>
      </label>
    </div>
    <div class="lab-stage">
      <p class="lab-stage-label">Positioned line canvas (manual render)</p>
      <div class="line-canvas" id="ml-canvas"></div>
    </div>
    <ol class="lab-line-list" id="ml-lines"></ol>
    <pre class="lab-output" id="ml-out"></pre>
  `;

  const slider = root.querySelector('#ml-width');
  const textInput = root.querySelector('#ml-text');
  const canvas = root.querySelector('#ml-canvas');
  const list = root.querySelector('#ml-lines');
  const out = root.querySelector('#ml-out');

  bindRange(slider, root.querySelector('#ml-width-val'));

  function run() {
    const width = Number(slider.value);
    const text = textInput.value;

    const prepared = prepareWithSegments(text, BODY_FONT);
    const t0 = performance.now();
    const { lines, height, lineCount } = layoutWithLines(prepared, width, BODY_LINE_HEIGHT);
    const ms = (performance.now() - t0).toFixed(2);

    canvas.style.height = `${height + 24}px`;
    canvas.style.width = `${width + 24}px`;
    canvas.replaceChildren();

    list.replaceChildren();
    lines.forEach((line, i) => {
      const y = i * BODY_LINE_HEIGHT;

      const lineEl = document.createElement('div');
      lineEl.className = 'line-canvas-line';
      lineEl.style.top = `${y}px`;
      lineEl.style.maxWidth = `${width}px`;
      lineEl.textContent = line.text;
      canvas.appendChild(lineEl);

      const ruler = document.createElement('span');
      ruler.className = 'line-canvas-ruler';
      ruler.style.top = `${y}px`;
      ruler.textContent = `${Math.round(line.width)}px`;
      canvas.appendChild(ruler);

      const li = document.createElement('li');
      li.textContent = `L${String(i + 1).padStart(2, '0')} · w${Math.round(line.width)} · ${line.text}`;
      list.appendChild(li);
    });

    out.textContent =
      lines.map((l, i) => `L${i + 1} (${Math.round(l.width)}px): ${l.text}`).join('\n') +
      `\n\nTotal: ${lineCount} lines, ${height}px, ${ms}ms · DOM reads: 0`;

    updateHud({ width, lines: lineCount, height, ms });
  }

  slider.addEventListener('input', run);
  textInput.addEventListener('input', run);
  run();
}
