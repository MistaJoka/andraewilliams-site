import { prepare, layout } from '@chenglou/pretext';
import { updateHud } from '../router.js';
import { BODY_FONT, BODY_LINE_HEIGHT } from '../shared/fonts.js';

const SAMPLES = [
  { label: 'English', text: 'Responsive card fitting with DOM-free multiline text measurement.' },
  { label: 'Spanish', text: 'Medición de texto multilínea sin reflujo del DOM para tarjetas responsivas.' },
  { label: 'Arabic', text: 'قياس النص متعدد الأسطر دون إعادة تدفق DOM للبطاقات المتجاوبة.' },
  { label: 'Chinese', text: '无 DOM 重排的响应式卡片多行文本测量与换行预测。' },
  { label: 'Emoji', text: 'Shut up and take my money 💸 — Pretext handles emoji clusters 🎉✨' },
  {
    label: 'Long word',
    text: 'supercalifragilisticexpialidocious-antidisestablishmentarianism-unbreakable-token',
  },
  { label: 'Code', text: 'const prepared = prepare(text, "400 14px Inter"); layout(prepared, 320, 22);' },
];

export function mountI18nStress(root) {
  root.innerHTML = `
    <p class="lab-prose">What this proves: one prepare() + layout() path handles mixed scripts, emoji, and long tokens.</p>
    <div class="lab-controls">
      <label class="lab-control">Width (px)
        <input type="range" id="i18n-width" min="160" max="400" value="280" />
        <span id="i18n-width-val">280px</span>
      </label>
      <div class="lab-nav" id="i18n-buttons"></div>
      <div class="lab-sample-grid" id="i18n-grid"></div>
    </div>
    <pre class="lab-output" id="i18n-out"></pre>
  `;

  const slider = root.querySelector('#i18n-width');
  const buttons = root.querySelector('#i18n-buttons');
  const grid = root.querySelector('#i18n-grid');
  const out = root.querySelector('#i18n-out');

  SAMPLES.forEach((sample) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lab-nav-link';
    btn.textContent = sample.label;
    btn.addEventListener('click', () => run(sample.label));
    buttons.appendChild(btn);
  });

  const preparedMap = new Map(
    SAMPLES.map((s) => [s.label, prepare(s.text, BODY_FONT)])
  );

  function run(highlightLabel) {
    const width = Number(slider.value);
    root.querySelector('#i18n-width-val').textContent = `${width}px`;

    const t0 = performance.now();
    const rows = SAMPLES.map((sample) => {
      const result = layout(preparedMap.get(sample.label), width, BODY_LINE_HEIGHT);
      return { ...sample, ...result };
    });
    const ms = (performance.now() - t0).toFixed(2);

    grid.replaceChildren();
    rows.forEach((row) => {
      const div = document.createElement('div');
      div.className = 'lab-sample-row';
      if (row.label === highlightLabel) div.style.background = 'var(--primary-dim)';
      div.innerHTML = `
        <span class="lab-sample-label">${row.label}</span>
        <span>${row.text}</span>
        <span class="lab-sample-metrics">${row.lineCount}L · ${row.height}px</span>
      `;
      grid.appendChild(div);
    });

    out.textContent =
      rows.map((r) => `${r.label}: ${r.lineCount} lines, ${r.height}px`).join('\n') +
      `\n\nBatch layout: ${ms}ms · DOM reads: 0`;

    const totalLines = rows.reduce((n, r) => n + r.lineCount, 0);
    updateHud({ width, lines: totalLines, height: rows[0]?.height ?? 0, ms });
  }

  slider.addEventListener('input', () => run());
  run();
}
