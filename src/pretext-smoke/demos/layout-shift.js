import { prepare, layout } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { BODY_FONT, BODY_LINE_HEIGHT } from '../shared/fonts.js';

const DELAY_MS = 800;
const TEXT =
  'This paragraph loads asynchronously. Without reserved height the card jumps. With Pretext the space is locked first.';

export function mountLayoutShift(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: measure first → reserve space → render with confidence. Non-technical version: good UI does not jump.</p>
    <div class="lab-compare">
      <div class="lab-compare-col">
        <h3>Bad: render first</h3>
        <div class="lab-card-preview" id="ls-bad-wrap" style="min-height:0">
          <p class="lab-card-preview-body" id="ls-bad">Waiting for text…</p>
        </div>
        <p class="lab-prose" style="font-size:0.75rem">Text loads → card jumps.</p>
        <button type="button" class="lab-nav-link" id="ls-bad-btn">Simulate load</button>
      </div>
      <div class="lab-compare-col">
        <h3>Good: measure first</h3>
        <div class="lab-card-preview" id="ls-good-wrap">
          <p class="lab-card-preview-body" id="ls-good" style="visibility:hidden">Reserved</p>
        </div>
        <p class="lab-prose" style="font-size:0.75rem">Measure first → card stays locked.</p>
        <button type="button" class="lab-nav-link" id="ls-good-btn">Simulate load</button>
      </div>
    </div>
    <pre class="lab-output" id="ls-out"></pre>
  `;

  const badWrap = root.querySelector('#ls-bad-wrap');
  const goodWrap = root.querySelector('#ls-good-wrap');
  const bad = root.querySelector('#ls-bad');
  const good = root.querySelector('#ls-good');
  const out = root.querySelector('#ls-out');
  const prepared = prepare(TEXT, BODY_FONT);
  const width = 280;

  const t0 = performance.now();
  const predicted = layout(prepared, width, BODY_LINE_HEIGHT);
  const ms = (performance.now() - t0).toFixed(2);

  goodWrap.style.minHeight = `${predicted.height + 24}px`;
  goodWrap.style.maxWidth = `${width}px`;

  out.textContent =
    `Predicted height: ${predicted.height}px (${predicted.lineCount} lines)\n` +
    `Reserved before render · Layout: ${ms}ms · DOM reads: 0`;

  updateHud({ width, lines: predicted.lineCount, height: predicted.height, ms });

  root.querySelector('#ls-bad-btn').addEventListener('click', () => {
    badWrap.style.minHeight = '0';
    bad.textContent = 'Loading…';
    setTimeout(() => {
      bad.textContent = TEXT;
    }, DELAY_MS);
  });

  root.querySelector('#ls-good-btn').addEventListener('click', () => {
    good.style.visibility = 'hidden';
    good.textContent = 'Loading…';
    setTimeout(() => {
      good.textContent = TEXT;
      good.style.visibility = 'visible';
    }, DELAY_MS);
  });
}
