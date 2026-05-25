import { prepare, layout } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { BODY_FONT, BODY_LINE_HEIGHT } from '../shared/fonts.js';

const PLACEHOLDER_ITEMS = [
  'Previous activity — system nominal',
  'Field note archived',
  'Arsenal sync complete',
  'Status strip updated',
];

const DYNAMIC_TEXT =
  'This lead description loads asynchronously. Miami property manager wants recurring landscaping quote, monthly billing, and seasonal mulch refresh across three HOA sites with different service windows.';

export function mountLayoutShift(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: bad UI renders unknown height first and the feed jumps. Good UI calls <code>layout()</code>, reserves space, then paints — stable for non-technical visitors too.</p>
    <div class="lab-compare">
      <div class="lab-compare-col">
        <h3>Bad: render first</h3>
        <p class="lab-prose" style="font-size:0.75rem;margin-bottom:0.5rem">Text loads → cards below jump.</p>
        <div class="feed-scroll" id="ls-bad-feed"></div>
        <button type="button" class="lab-nav-link" id="ls-bad-btn" style="margin-top:0.5rem">Inject async card</button>
      </div>
      <div class="lab-compare-col">
        <h3>Good: measure first</h3>
        <p class="lab-prose" style="font-size:0.75rem;margin-bottom:0.5rem">Pretext height → reserve → render.</p>
        <div class="feed-scroll" id="ls-good-feed"></div>
        <button type="button" class="lab-nav-link" id="ls-good-btn" style="margin-top:0.5rem">Inject with reserve</button>
      </div>
    </div>
    <dl class="lab-metrics" id="ls-metrics"></dl>
  `;

  const badFeed = root.querySelector('#ls-bad-feed');
  const goodFeed = root.querySelector('#ls-good-feed');
  const metricsEl = root.querySelector('#ls-metrics');
  const prepared = prepare(DYNAMIC_TEXT, BODY_FONT);
  const width = 260;

  function seedFeed(feed) {
    feed.replaceChildren();
    PLACEHOLDER_ITEMS.forEach((text) => {
      const el = document.createElement('div');
      el.className = 'feed-item';
      el.textContent = text;
      feed.appendChild(el);
    });
  }

  seedFeed(badFeed);
  seedFeed(goodFeed);

  const predicted = layout(prepared, width, BODY_LINE_HEIGHT);

  metricsEl.innerHTML = `
    <div class="lab-metrics-row"><dt>Predicted height</dt><dd>${predicted.height}px (${predicted.lineCount} lines)</dd></div>
    <div class="lab-metrics-row"><dt>Reserved before paint</dt><dd>Good column only</dd></div>
    <div class="lab-metrics-row"><dt>DOM reads (Pretext path)</dt><dd>0</dd></div>
  `;

  updateHud({
    width,
    lines: predicted.lineCount,
    height: predicted.height,
    ms: '0.05',
  });

  root.querySelector('#ls-bad-btn').addEventListener('click', () => {
    const loading = document.createElement('div');
    loading.className = 'feed-item feed-item--dynamic feed-item--skeleton';
    loading.textContent = 'Loading lead…';
    badFeed.insertBefore(loading, badFeed.firstChild);
    badFeed.scrollTop = 0;

    setTimeout(() => {
      loading.classList.remove('feed-item--skeleton');
      loading.textContent = DYNAMIC_TEXT;
      loading.style.minHeight = '';
    }, 700);
  });

  root.querySelector('#ls-good-btn').addEventListener('click', () => {
    const reserved = document.createElement('div');
    reserved.className = 'feed-item feed-item--reserved';
    reserved.style.height = `${predicted.height}px`;
    reserved.textContent = `Reserved ${predicted.height}px via layout()`;
    goodFeed.insertBefore(reserved, goodFeed.firstChild);
    goodFeed.scrollTop = 0;

    setTimeout(() => {
      reserved.className = 'feed-item feed-item--dynamic';
      reserved.style.height = '';
      reserved.style.minHeight = `${predicted.height}px`;
      reserved.textContent = DYNAMIC_TEXT;
    }, 700);
  });
}
