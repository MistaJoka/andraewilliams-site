import { prepareWithSegments } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { BODY_FONT, BODY_LINE_HEIGHT } from '../shared/fonts.js';
import { shrinkwrapWidth, widestLineAt } from '../shared/shrinkwrap.js';
import { bindRange } from '../shared/ui.js';

const MESSAGES = [
  { text: 'Hey, did you see the new pretext library?', sent: false },
  { text: 'Yeah! It measures text without the DOM. Pure JavaScript arithmetic.', sent: true },
  {
    text: 'The shrinkwrap feature finds the exact minimum width for multiline text. CSS cannot do that.',
    sent: false,
  },
  { text: '성능 최적화가 정말 많이 되었더라고요 🎉', sent: true },
  { text: 'Wait, so it handles CJK and emoji too?', sent: false },
  {
    text: 'Everything. Mixed bidi, grapheme clusters, the works. Try the width slider.',
    sent: true,
  },
  { text: 'ok this is genuinely impressive', sent: false },
  {
    text: 'Zero layout reflow. You could shrinkwrap 10,000 bubbles and the browser would not blink.',
    sent: true,
  },
];

const PADDING = 24;
const BUBBLE_MAX_RATIO = 0.8;

export function mountShrinkwrapGuard(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: CSS <code>fit-content</code> sizes to the longest line — Pretext binary-searches the tightest width that preserves line count. Inspired by <a href="https://somnai-dreams.github.io/pretext-demos/shrinkwrap-showdown.html" target="_blank" rel="noopener">somnai shrinkwrap showdown</a>.</p>
    <div class="lab-controls">
      <label class="lab-control">Chat width (px)
        <input type="range" id="sw-width" min="240" max="480" value="340" />
        <span id="sw-width-val">340px</span>
      </label>
      <label class="lab-control">
        <input type="checkbox" id="sw-animate" /> Auto-animate width
      </label>
    </div>
    <div class="lab-compare">
      <div class="lab-compare-col">
        <h3>CSS fit-content</h3>
        <div class="chat-stage" id="sw-css-chat"></div>
        <p class="chat-waste-total" id="sw-css-waste">0px wasted</p>
      </div>
      <div class="lab-compare-col">
        <h3>Pretext shrinkwrap</h3>
        <div class="chat-stage" id="sw-pretext-chat"></div>
        <p class="chat-waste-total" id="sw-pretext-waste">0px wasted · 0 DOM reads</p>
      </div>
    </div>
    <pre class="lab-output" id="sw-out"></pre>
  `;

  const slider = root.querySelector('#sw-width');
  const cssChat = root.querySelector('#sw-css-chat');
  const pretextChat = root.querySelector('#sw-pretext-chat');
  const cssWasteEl = root.querySelector('#sw-css-waste');
  const pretextWasteEl = root.querySelector('#sw-pretext-waste');
  const out = root.querySelector('#sw-out');
  const animateCheck = root.querySelector('#sw-animate');

  const prepared = MESSAGES.map((m) => ({
    ...m,
    prepared: prepareWithSegments(m.text, BODY_FONT),
  }));

  const cssBubbles = [];
  const pretextBubbles = [];

  prepared.forEach((m) => {
    const cssBubble = document.createElement('div');
    cssBubble.className = `chat-bubble ${m.sent ? 'sent' : 'recv'}`;
    cssBubble.style.font = BODY_FONT;
    cssBubble.style.lineHeight = `${BODY_LINE_HEIGHT}px`;
    cssBubble.textContent = m.text;
    const waste = document.createElement('div');
    waste.className = 'waste-stripe';
    waste.style.display = 'none';
    cssBubble.appendChild(waste);
    cssChat.appendChild(cssBubble);
    cssBubbles.push({ ...m, el: cssBubble, wasteEl: waste });

    const ptBubble = document.createElement('div');
    ptBubble.className = `chat-bubble ${m.sent ? 'sent' : 'recv'}`;
    ptBubble.style.font = BODY_FONT;
    ptBubble.style.lineHeight = `${BODY_LINE_HEIGHT}px`;
    ptBubble.textContent = m.text;
    pretextChat.appendChild(ptBubble);
    pretextBubbles.push({ ...m, el: ptBubble });
  });

  bindRange(slider, root.querySelector('#sw-width-val'));

  let animRaf = null;
  let autoAnimate = false;

  function run(chatWidth) {
    const maxBubble = Math.floor(chatWidth * BUBBLE_MAX_RATIO);
    const contentMax = maxBubble - PADDING;

    const t0 = performance.now();
    let totalCssWaste = 0;
    let totalLines = 0;

    cssBubbles.forEach((b) => {
      b.el.style.maxWidth = `${maxBubble}px`;
      b.el.style.width = 'fit-content';

      const shrink = shrinkwrapWidth(b.prepared, contentMax);
      const cssWidest = widestLineAt(b.prepared, contentMax);
      const cssContentW = Math.min(contentMax, cssWidest);
      const waste = Math.max(0, cssContentW - shrink.width);

      totalCssWaste += waste;
      totalLines += shrink.lineCount;

      if (waste > 2) {
        b.wasteEl.style.display = 'block';
        b.wasteEl.style.width = `${waste}px`;
      } else {
        b.wasteEl.style.display = 'none';
      }
    });

    pretextBubbles.forEach((b) => {
      const shrink = shrinkwrapWidth(b.prepared, contentMax);
      const bubbleW = Math.min(maxBubble, shrink.width + PADDING);
      b.el.style.maxWidth = `${maxBubble}px`;
      b.el.style.width = `${bubbleW}px`;
    });

    const ms = (performance.now() - t0).toFixed(2);

    cssWasteEl.textContent = `${totalCssWaste}px wasted across thread`;
    pretextWasteEl.textContent = `0px wasted · ${MESSAGES.length} bubbles · 0 DOM reads`;

    out.textContent =
      `Chat width: ${chatWidth}px\n` +
      `Max bubble: ${maxBubble}px\n` +
      `Messages: ${MESSAGES.length}\n` +
      `Total lines (Pretext): ${totalLines}\n` +
      `CSS waste: ${totalCssWaste}px\n` +
      `Shrinkwrap batch: ${ms}ms`;

    updateHud({ width: chatWidth, lines: totalLines, height: totalLines * BODY_LINE_HEIGHT, ms });
  }

  function setWidth(w) {
    slider.value = String(w);
    root.querySelector('#sw-width-val').textContent = `${w}px`;
    run(w);
  }

  slider.addEventListener('input', () => setWidth(Number(slider.value)));

  animateCheck.addEventListener('change', () => {
    autoAnimate = animateCheck.checked;
    if (autoAnimate) {
      const loop = (now) => {
        if (!autoAnimate) return;
        const min = Number(slider.min);
        const max = Number(slider.max);
        const w = Math.round(min + (max - min) * (0.5 + 0.5 * Math.sin(now / 2500)));
        setWidth(w);
        animRaf = requestAnimationFrame(loop);
      };
      animRaf = requestAnimationFrame(loop);
    } else if (animRaf) {
      cancelAnimationFrame(animRaf);
    }
  });

  slider.addEventListener('pointerdown', () => {
    autoAnimate = false;
    animateCheck.checked = false;
    if (animRaf) cancelAnimationFrame(animRaf);
  });

  setWidth(340);

  return () => {
    if (animRaf) cancelAnimationFrame(animRaf);
  };
}
