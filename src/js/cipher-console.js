// Cipher Console front-end. Collects input, POSTs to the /api/cipher Python
// serverless function, and renders the result or a structured error.
const opSel = document.querySelector('#cipher-op');
const modeField = document.querySelector('#cipher-mode-field');
const modeBtns = [...document.querySelectorAll('.cipher-mode-btn')];
const input = document.querySelector('#cipher-input');
const execBtn = document.querySelector('#cipher-execute');
const statusEl = document.querySelector('#cipher-status');
const outputEl = document.querySelector('#cipher-output');
const copyBtn = document.querySelector('#cipher-copy');

let mode = 'encode';

// ROT13 is self-inverse, so the encode/decode toggle is meaningless for it.
function syncModeVisibility() {
  modeField.hidden = opSel.value === 'rot13';
}
opSel.addEventListener('change', syncModeVisibility);
syncModeVisibility();

modeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    modeBtns.forEach((other) => {
      const on = other === btn;
      other.classList.toggle('active', on);
      other.setAttribute('aria-pressed', String(on));
    });
  });
});

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.dataset.kind = kind || '';
}

async function execute() {
  const text = input.value;
  if (!text) {
    setStatus('input is empty', 'warn');
    return;
  }
  const op = opSel.value;
  const payload = { op, mode: op === 'rot13' ? 'encode' : mode, text };

  execBtn.disabled = true;
  setStatus('running…', '');
  outputEl.textContent = '';
  copyBtn.hidden = true;

  try {
    const res = await fetch('/api/cipher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data.result === 'string') {
      outputEl.textContent = data.result;
      copyBtn.hidden = data.result.length === 0;
      setStatus('done', 'ok');
    } else {
      setStatus('ERROR // ' + (data.error || 'http ' + res.status), 'error');
    }
  } catch (err) {
    setStatus('ERROR // function unreachable (deploy to run)', 'error');
  } finally {
    execBtn.disabled = false;
  }
}

execBtn.addEventListener('click', execute);
input.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') execute();
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(outputEl.textContent);
    copyBtn.textContent = 'copied';
    setTimeout(() => {
      copyBtn.textContent = 'copy';
    }, 1200);
  } catch (err) {
    /* clipboard unavailable — no-op */
  }
});
