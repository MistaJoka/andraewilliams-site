import { prepare, layout } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { TITLE_FONT, TITLE_LINE_HEIGHT } from '../shared/fonts.js';

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
    <p class="lab-prose">What this proves: virtual lists need exact row heights before render — batch layout() is microseconds, not reflows.</p>
    <div class="lab-controls">
      <label class="lab-control">Card width (px)
        <input type="range" id="vh-width" min="200" max="400" value="300" />
        <span id="vh-width-val">300px</span>
      </label>
      <label class="lab-control">Items
        <input type="range" id="vh-count" min="10" max="50" value="50" />
        <span id="vh-count-val">50</span>
      </label>
    </div>
    <pre class="lab-output" id="vh-out"></pre>
  `;

  const widthSlider = root.querySelector('#vh-width');
  const countSlider = root.querySelector('#vh-count');
  const out = root.querySelector('#vh-out');

  const prepared = TITLES.map((t) => prepare(t, TITLE_FONT));

  function run() {
    const width = Number(widthSlider.value);
    const count = Number(countSlider.value);
    root.querySelector('#vh-width-val').textContent = `${width}px`;
    root.querySelector('#vh-count-val').textContent = String(count);

    const t0 = performance.now();
    let totalHeight = 0;
    let maxLines = 0;
    const heights = [];
    for (let i = 0; i < count; i++) {
      const result = layout(prepared[i], width, TITLE_LINE_HEIGHT);
      totalHeight += result.height;
      maxLines = Math.max(maxLines, result.lineCount);
      heights.push(result.height);
    }
    const ms = (performance.now() - t0).toFixed(2);

    out.textContent =
      `Items: ${count}\n` +
      `Total scroll extent: ${totalHeight}px\n` +
      `Avg height: ${(totalHeight / count).toFixed(1)}px\n` +
      `Max lines per item: ${maxLines}\n` +
      `Batch layout: ${ms}ms\n` +
      `DOM reads: 0\n\n` +
      `First 5 heights: ${heights.slice(0, 5).join(', ')}px`;

    updateHud({ width, lines: maxLines, height: totalHeight, ms });
  }

  widthSlider.addEventListener('input', run);
  countSlider.addEventListener('input', run);
  run();
}
