import { prepare, layout } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { BODY_FONT, BODY_LINE_HEIGHT } from '../shared/fonts.js';
import { bindRange } from '../shared/ui.js';

const SAMPLES = [
  { label: 'English', text: 'Responsive card fitting with DOM-free multiline text measurement.', dir: 'ltr' },
  {
    label: 'Spanish',
    text: 'Medición de texto multilínea sin reflujo del DOM para tarjetas responsivas.',
    dir: 'ltr',
  },
  {
    label: 'Arabic',
    text: 'قياس النص متعدد الأسطر دون إعادة تدفق DOM للبطاقات المتجاوبة.',
    dir: 'rtl',
  },
  { label: 'Chinese', text: '无 DOM 重排的响应式卡片多行文本测量与换行预测。', dir: 'ltr' },
  { label: 'Emoji', text: 'Shut up and take my money 💸 — Pretext handles emoji clusters 🎉✨', dir: 'ltr' },
  {
    label: 'Long word',
    text: 'supercalifragilisticexpialidocious-antidisestablishmentarianism-unbreakable-token',
    dir: 'ltr',
  },
  {
    label: 'Code',
    text: 'const prepared = prepare(text, "400 14px Inter"); layout(prepared, 320, 22);',
    dir: 'ltr',
  },
];

export function mountI18nStress(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: one prepare() + layout() path handles Latin, RTL, CJK, emoji, long tokens, and code-like strings.</p>
    <div class="lab-controls">
      <label class="lab-control">Width (px)
        <input type="range" id="i18n-width" min="160" max="400" value="280" />
        <span id="i18n-width-val">280px</span>
      </label>
      <div class="i18n-btn-row" id="i18n-buttons"></div>
    </div>
    <div class="lab-stage">
      <p class="lab-stage-label">Focused sample</p>
      <div class="i18n-focus" id="i18n-focus"></div>
      <dl class="lab-metrics" id="i18n-focus-metrics" style="margin-top:0.65rem"></dl>
    </div>
    <div class="lab-stage" style="margin-top:0.75rem">
      <p class="lab-stage-label">Comparison matrix</p>
      <div class="lab-sample-grid" id="i18n-grid"></div>
    </div>
    <pre class="lab-output" id="i18n-out"></pre>
  `;

  const slider = root.querySelector('#i18n-width');
  const buttons = root.querySelector('#i18n-buttons');
  const focus = root.querySelector('#i18n-focus');
  const focusMetrics = root.querySelector('#i18n-focus-metrics');
  const grid = root.querySelector('#i18n-grid');
  const out = root.querySelector('#i18n-out');

  let activeLabel = SAMPLES[0].label;

  const preparedMap = new Map(
    SAMPLES.map((s) => [s.label, prepare(s.text, BODY_FONT)])
  );

  SAMPLES.forEach((sample) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lab-nav-link';
    btn.textContent = sample.label;
    btn.addEventListener('click', () => {
      activeLabel = sample.label;
      run();
    });
    buttons.appendChild(btn);
  });

  bindRange(slider, root.querySelector('#i18n-width-val'));

  function run() {
    const width = Number(slider.value);
    const t0 = performance.now();

    const rows = SAMPLES.map((sample) => {
      const result = layout(preparedMap.get(sample.label), width, BODY_LINE_HEIGHT);
      return { ...sample, ...result };
    });
    const ms = (performance.now() - t0).toFixed(2);

    const active = rows.find((r) => r.label === activeLabel) || rows[0];

    focus.textContent = active.text;
    focus.dir = active.dir;
    focusMetrics.innerHTML = `
      <div class="lab-metrics-row"><dt>Script</dt><dd>${active.label}${active.dir === 'rtl' ? ' (RTL)' : ''}</dd></div>
      <div class="lab-metrics-row"><dt>Lines</dt><dd>${active.lineCount}</dd></div>
      <div class="lab-metrics-row"><dt>Height</dt><dd>${active.height}px</dd></div>
      <div class="lab-metrics-row"><dt>Width</dt><dd>${width}px</dd></div>
    `;

    buttons.querySelectorAll('.lab-nav-link').forEach((btn) => {
      btn.classList.toggle('active', btn.textContent === activeLabel);
    });

    grid.replaceChildren();
    rows.forEach((row) => {
      const div = document.createElement('div');
      div.className = 'lab-sample-row';
      if (row.label === activeLabel) div.style.background = 'var(--primary-dim)';
      div.innerHTML = `
        <span class="lab-sample-label">${row.label}</span>
        <span dir="${row.dir}">${row.text}</span>
        <span class="lab-sample-metrics">${row.lineCount}L · ${row.height}px</span>
      `;
      grid.appendChild(div);
    });

    out.textContent =
      rows.map((r) => `${r.label}: ${r.lineCount} lines, ${r.height}px`).join('\n') +
      `\n\nBatch layout (${SAMPLES.length} samples): ${ms}ms · DOM reads: 0`;

    updateHud({
      width,
      lines: active.lineCount,
      height: active.height,
      ms,
    });
  }

  slider.addEventListener('input', run);
  run();
}
