import { prepareWithSegments, walkLineRanges } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { BODY_FONT, BODY_LINE_HEIGHT } from '../shared/fonts.js';

const SAMPLE =
  'The shrinkwrap feature finds the exact minimum width for multiline text. CSS fit-content sizes to the longest line — shorter lines leave dead space.';

function shrinkwrap(prepared, maxWidth) {
  let targetLineCount = 0;
  let widestLine = 0;
  walkLineRanges(prepared, maxWidth, (line) => {
    targetLineCount++;
    if (line.width > widestLine) widestLine = line.width;
  });
  if (targetLineCount <= 1) {
    return { width: Math.ceil(widestLine), lineCount: targetLineCount };
  }
  let lo = 1;
  let hi = Math.ceil(widestLine);
  while (lo < hi) {
    const mid = lo + (hi >>> 1);
    let count = 0;
    walkLineRanges(prepared, mid, () => {
      count++;
    });
    if (count <= targetLineCount) hi = mid;
    else lo = mid + 1;
  }
  return { width: lo, lineCount: targetLineCount };
}

export function mountShrinkwrapGuard(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: CSS cannot find the narrowest width that preserves line count — Pretext binary-searches it with walkLineRanges(), zero DOM reads on the Pretext path.</p>
    <div class="lab-controls">
      <label class="lab-control">Container width (px)
        <input type="range" id="sw-width" min="200" max="480" value="340" />
        <span id="sw-width-val">340px</span>
      </label>
      <label class="lab-control">Text
        <textarea id="sw-text">${SAMPLE}</textarea>
      </label>
    </div>
    <div class="lab-compare">
      <div class="lab-compare-col">
        <h3>CSS fit-content</h3>
        <div class="lab-card-preview" id="sw-css" style="width:fit-content;max-width:80%"></div>
        <p class="lab-prose" id="sw-css-note" style="margin-top:0.5rem;font-size:0.75rem"></p>
      </div>
      <div class="lab-compare-col">
        <h3>Pretext shrinkwrap</h3>
        <div class="lab-card-preview" id="sw-pretext"></div>
        <p class="lab-prose" id="sw-pretext-note" style="margin-top:0.5rem;font-size:0.75rem"></p>
      </div>
    </div>
    <pre class="lab-output" id="sw-out"></pre>
  `;

  const slider = root.querySelector('#sw-width');
  const textInput = root.querySelector('#sw-text');
  const cssBox = root.querySelector('#sw-css');
  const pretextBox = root.querySelector('#sw-pretext');
  const out = root.querySelector('#sw-out');

  function run() {
    const containerWidth = Number(slider.value);
    const text = textInput.value;
    root.querySelector('#sw-width-val').textContent = `${containerWidth}px`;

    const prepared = prepareWithSegments(text, BODY_FONT);
    const contentMax = Math.floor(containerWidth * 0.8) - 24;

    const t0 = performance.now();
    const { width: shrinkWidth, lineCount } = shrinkwrap(prepared, contentMax);
    const ms = (performance.now() - t0).toFixed(2);

    cssBox.textContent = text;
    cssBox.style.font = BODY_FONT;
    cssBox.style.lineHeight = `${BODY_LINE_HEIGHT}px`;
    cssBox.style.maxWidth = `${Math.floor(containerWidth * 0.8)}px`;

    pretextBox.textContent = text;
    pretextBox.style.font = BODY_FONT;
    pretextBox.style.lineHeight = `${BODY_LINE_HEIGHT}px`;
    pretextBox.style.width = `${shrinkWidth + 24}px`;
    pretextBox.style.maxWidth = `${Math.floor(containerWidth * 0.8)}px`;

    const cssDomWidth = cssBox.offsetWidth;
    root.querySelector('#sw-css-note').textContent =
      `Rendered width: ${cssDomWidth}px (DOM read for CSS column only)`;
    root.querySelector('#sw-pretext-note').textContent =
      `Tight width: ${shrinkWidth + 24}px · ${lineCount} lines · 0 DOM reads`;

    out.textContent =
      `Content max: ${contentMax}px\n` +
      `Pretext shrink width: ${shrinkWidth}px (+ padding)\n` +
      `Line count: ${lineCount}\n` +
      `Binary search: ${ms}ms`;

    updateHud({ width: shrinkWidth, lines: lineCount, height: lineCount * BODY_LINE_HEIGHT, ms });
  }

  slider.addEventListener('input', run);
  textInput.addEventListener('input', run);
  run();
}
