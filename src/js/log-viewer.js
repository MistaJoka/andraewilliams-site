/**
 * Raw log.decisions viewer — no markdown parsing.
 */
const LOG_URL = 'data/decisions.md';
const LOG_RAW =
  'https://github.com/MistaJoka/andraewilliams-site/blob/main/docs/decisions.md';

async function init() {
  const pre = document.getElementById('log-viewer-body');
  const rawLink = document.getElementById('log-raw-link');
  if (!pre) return;

  if (rawLink) {
    rawLink.href = LOG_RAW;
  }

  try {
    const res = await fetch(LOG_URL);
    if (!res.ok) throw new Error(String(res.status));
    pre.textContent = await res.text();
  } catch {
    pre.textContent = 'log.decisions: fetch failed — see source on GitHub';
  }
}

document.addEventListener('DOMContentLoaded', init);
