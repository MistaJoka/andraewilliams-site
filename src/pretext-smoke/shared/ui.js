/** Bind range input to a label element showing value + suffix. */
export function bindRange(input, labelEl, format = (v) => `${v}px`) {
  const sync = () => {
    labelEl.textContent = format(Number(input.value));
  };
  input.addEventListener('input', sync);
  sync();
  return sync;
}

export function statusBadge(overflow, extra = '') {
  const cls = overflow ? 'lab-status--risk' : 'lab-status--safe';
  const text = overflow ? 'OVERFLOW RISK' : 'SAFE';
  return `<span class="lab-status ${cls}">${text}${extra ? ` · ${extra}` : ''}</span>`;
}

export function metricsBlock(rows) {
  return `<dl class="lab-metrics">${rows
    .map(
      ([k, v]) =>
        `<div class="lab-metrics-row"><dt>${k}</dt><dd>${v}</dd></div>`
    )
    .join('')}</dl>`;
}
