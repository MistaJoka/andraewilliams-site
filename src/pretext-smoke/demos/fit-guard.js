import { prepare, layout } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { TITLE_FONT, TITLE_LINE_HEIGHT, BODY_FONT, BODY_LINE_HEIGHT } from '../shared/fonts.js';

const DEFAULT_TITLE = 'Pretext Layout Lab';
const DEFAULT_BODY =
  'A browser text-measurement lab that predicts multiline card height, line count, and overflow risk before layout.';

export function mountFitGuard(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: real UI quality control — know overflow risk before the card ships.</p>
    <div class="lab-controls">
      <label class="lab-control">Title
        <input type="text" id="fg-title" value="${DEFAULT_TITLE}" />
      </label>
      <label class="lab-control">Description
        <textarea id="fg-body">${DEFAULT_BODY}</textarea>
      </label>
      <label class="lab-control">Card width (px)
        <input type="range" id="fg-width" min="200" max="480" value="320" />
        <span id="fg-width-val">320px</span>
      </label>
      <label class="lab-control">Title max lines
        <input type="range" id="fg-title-max" min="1" max="4" value="2" />
        <span id="fg-title-max-val">2</span>
      </label>
      <label class="lab-control">Description max lines
        <input type="range" id="fg-body-max" min="1" max="6" value="4" />
        <span id="fg-body-max-val">4</span>
      </label>
    </div>
    <div class="lab-card-preview" id="fg-preview">
      <p class="lab-card-preview-title" id="fg-preview-title"></p>
      <p class="lab-card-preview-body" id="fg-preview-body"></p>
    </div>
    <div id="fg-status"></div>
    <pre class="lab-output" id="fg-out"></pre>
  `;

  const titleInput = root.querySelector('#fg-title');
  const bodyInput = root.querySelector('#fg-body');
  const widthSlider = root.querySelector('#fg-width');
  const titleMaxSlider = root.querySelector('#fg-title-max');
  const bodyMaxSlider = root.querySelector('#fg-body-max');
  const previewTitle = root.querySelector('#fg-preview-title');
  const previewBody = root.querySelector('#fg-preview-body');
  const statusEl = root.querySelector('#fg-status');
  const out = root.querySelector('#fg-out');

  let titlePrepared = prepare(DEFAULT_TITLE, TITLE_FONT);
  let bodyPrepared = prepare(DEFAULT_BODY, BODY_FONT);

  function run() {
    const title = titleInput.value;
    const body = bodyInput.value;
    const width = Number(widthSlider.value);
    const titleMax = Number(titleMaxSlider.value);
    const bodyMax = Number(bodyMaxSlider.value);

    root.querySelector('#fg-width-val').textContent = `${width}px`;
    root.querySelector('#fg-title-max-val').textContent = String(titleMax);
    root.querySelector('#fg-body-max-val').textContent = String(bodyMax);

    titlePrepared = prepare(title, TITLE_FONT);
    bodyPrepared = prepare(body, BODY_FONT);

    const t0 = performance.now();
    const titleResult = layout(titlePrepared, width, TITLE_LINE_HEIGHT);
    const bodyResult = layout(bodyPrepared, width, BODY_LINE_HEIGHT);
    const ms = (performance.now() - t0).toFixed(2);

    const overflow = titleResult.lineCount > titleMax || bodyResult.lineCount > bodyMax;

    previewTitle.textContent = title;
    previewBody.textContent = body;
    root.querySelector('#fg-preview').style.maxWidth = `${width}px`;

    statusEl.innerHTML = overflow
      ? `<span class="lab-status lab-status--risk">OVERFLOW RISK</span>`
      : `<span class="lab-status lab-status--safe">SAFE</span>`;

    out.textContent =
      `Title lines: ${titleResult.lineCount} / ${titleMax}\n` +
      `Description lines: ${bodyResult.lineCount} / ${bodyMax}\n` +
      `Status: ${overflow ? 'OVERFLOW RISK' : 'SAFE'}\n` +
      `Predicted height: ${titleResult.height + bodyResult.height}px\n` +
      `Layout: ${ms}ms · DOM reads: 0`;

    updateHud({
      width,
      lines: titleResult.lineCount + bodyResult.lineCount,
      height: titleResult.height + bodyResult.height,
      ms,
    });
  }

  root.querySelectorAll('input, textarea').forEach((el) => {
    el.addEventListener('input', run);
  });
  run();
}
