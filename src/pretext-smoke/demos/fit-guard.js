import { prepare, layout } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { TITLE_FONT, TITLE_LINE_HEIGHT, BODY_FONT, BODY_LINE_HEIGHT } from '../shared/fonts.js';
import { bindRange, statusBadge } from '../shared/ui.js';

const DEFAULT_TITLE = 'Pretext Layout Lab';
const DEFAULT_BODY =
  'A browser text-measurement lab that predicts multiline card height, line count, and overflow risk before layout. Built to understand how high-performance UI systems avoid expensive DOM measurement and keep responsive cards stable.';

export function mountFitGuard(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: real UI quality control — measure title and body against line budgets before the card ships. This is the main public demo.</p>
    <div class="lab-controls">
      <label class="lab-control">Title
        <input type="text" id="fg-title" value="${DEFAULT_TITLE}" />
      </label>
      <label class="lab-control">Description
        <textarea id="fg-body" rows="4">${DEFAULT_BODY}</textarea>
      </label>
      <div class="lab-control-row">
        <label class="lab-control">Card width (px)
          <input type="range" id="fg-width" min="200" max="480" value="320" />
          <span id="fg-width-val">320px</span>
        </label>
        <label class="lab-control">Title max lines
          <input type="range" id="fg-title-max" min="1" max="4" value="2" />
          <span id="fg-title-max-val">2</span>
        </label>
        <label class="lab-control">Description max lines
          <input type="range" id="fg-body-max" min="1" max="8" value="4" />
          <span id="fg-body-max-val">4</span>
        </label>
      </div>
    </div>
    <div class="lab-stage">
      <p class="lab-stage-label">Live project card preview</p>
      <div class="demo-project-card" id="fg-card">
        <div class="demo-project-card-head">
          <div class="demo-clamp-title" id="fg-title-wrap">
            <p class="demo-project-card-title" id="fg-preview-title"></p>
          </div>
          <div id="fg-badge"></div>
        </div>
        <div class="demo-clamp-body" id="fg-body-wrap">
          <p class="demo-project-card-body" id="fg-preview-body"></p>
        </div>
        <div class="demo-fit-readout" id="fg-readout"></div>
      </div>
    </div>
    <div id="fg-status-wrap"></div>
    <dl class="lab-metrics" id="fg-metrics"></dl>
  `;

  const titleInput = root.querySelector('#fg-title');
  const bodyInput = root.querySelector('#fg-body');
  const widthSlider = root.querySelector('#fg-width');
  const titleMaxSlider = root.querySelector('#fg-title-max');
  const bodyMaxSlider = root.querySelector('#fg-body-max');
  const card = root.querySelector('#fg-card');
  const titleWrap = root.querySelector('#fg-title-wrap');
  const bodyWrap = root.querySelector('#fg-body-wrap');
  const previewTitle = root.querySelector('#fg-preview-title');
  const previewBody = root.querySelector('#fg-preview-body');
  const statusWrap = root.querySelector('#fg-status-wrap');
  const metricsEl = root.querySelector('#fg-metrics');
  const readout = root.querySelector('#fg-readout');

  bindRange(widthSlider, root.querySelector('#fg-width-val'));
  bindRange(titleMaxSlider, root.querySelector('#fg-title-max-val'), (v) => String(v));
  bindRange(bodyMaxSlider, root.querySelector('#fg-body-max-val'), (v) => String(v));

  function run() {
    const title = titleInput.value;
    const body = bodyInput.value;
    const width = Number(widthSlider.value);
    const titleMax = Number(titleMaxSlider.value);
    const bodyMax = Number(bodyMaxSlider.value);

    const titlePrepared = prepare(title, TITLE_FONT);
    const bodyPrepared = prepare(body, BODY_FONT);

    const t0 = performance.now();
    const titleResult = layout(titlePrepared, width, TITLE_LINE_HEIGHT);
    const bodyResult = layout(bodyPrepared, width, BODY_LINE_HEIGHT);
    const ms = (performance.now() - t0).toFixed(2);

    const titleOverflow = titleResult.lineCount > titleMax;
    const bodyOverflow = bodyResult.lineCount > bodyMax;
    const overflow = titleOverflow || bodyOverflow;

    previewTitle.textContent = title;
    previewBody.textContent = body;
    card.style.maxWidth = `${width}px`;
    card.classList.toggle('is-overflow', overflow);

    titleWrap.style.maxHeight = `${titleMax * TITLE_LINE_HEIGHT}px`;
    bodyWrap.style.maxHeight = `${bodyMax * BODY_LINE_HEIGHT}px`;
    titleWrap.classList.toggle('is-overflow', titleOverflow);
    bodyWrap.classList.toggle('is-overflow', bodyOverflow);

    statusWrap.innerHTML = statusBadge(
      overflow,
      `Title ${titleResult.lineCount}/${titleMax} · Body ${bodyResult.lineCount}/${bodyMax}`
    );

    readout.innerHTML = `
      <div><span>Title lines</span>${titleResult.lineCount} / ${titleMax}</div>
      <div><span>Description lines</span>${bodyResult.lineCount} / ${bodyMax}</div>
      <div><span>Predicted height</span>${titleResult.height + bodyResult.height}px</div>
      <div><span>Layout</span>${ms}ms · 0 DOM reads</div>
    `;

    metricsEl.innerHTML = `
      <div class="lab-metrics-row"><dt>Title lines</dt><dd>${titleResult.lineCount} / ${titleMax}</dd></div>
      <div class="lab-metrics-row"><dt>Description lines</dt><dd>${bodyResult.lineCount} / ${bodyMax}</dd></div>
      <div class="lab-metrics-row"><dt>Status</dt><dd>${overflow ? 'OVERFLOW RISK' : 'SAFE'}</dd></div>
      <div class="lab-metrics-row"><dt>Card width</dt><dd>${width}px</dd></div>
      <div class="lab-metrics-row"><dt>Predicted height</dt><dd>${titleResult.height + bodyResult.height}px</dd></div>
    `;

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
