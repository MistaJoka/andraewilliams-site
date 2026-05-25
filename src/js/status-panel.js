/**
 * Populates hero status strip + sidebar deploy badge from site-status.json.
 */
const STATUS_URL = 'data/site-status.json';

function formatStack(stack) {
  if (!Array.isArray(stack)) return 'unknown';
  return stack.join(' · ');
}

function setBadge(text, verified) {
  const badge = document.getElementById('deploy-badge');
  if (!badge) return;
  badge.textContent = text;
  badge.classList.toggle('badge--verified', verified);
}

function statusItem(label, value, dim) {
  const span = document.createElement('span');
  span.className = dim ? 'home-status-item home-status-item--dim' : 'home-status-item';
  span.innerHTML = `<span class="home-status-key">${label}</span><span class="home-status-val">${value}</span>`;
  return span;
}

function renderError(strip) {
  strip.replaceChildren();
  const err = document.createElement('span');
  err.className = 'home-status-error';
  err.textContent = 'status: fetch failed';
  strip.appendChild(err);
  setBadge('// unknown', false);
}

async function init() {
  const strip = document.getElementById('home-status-strip');
  if (!strip) return;

  let data = null;
  try {
    const res = await fetch(STATUS_URL);
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
  } catch {
    renderError(strip);
    return;
  }

  const verify = data?.verify ?? 'unknown';
  const stack = formatStack(data.stack);
  const commit = data?.commit ?? 'unknown';
  const toolCount = data?.toolCount ?? 'unknown';

  strip.replaceChildren(
    statusItem('stack', stack, true),
    statusItem('commit', commit, true),
    statusItem('verify', verify, true),
    statusItem('tools', String(toolCount), false)
  );

  if (verify === 'pass') {
    setBadge('// verify:pass', true);
  } else if (data?.commit === 'local') {
    setBadge('// local', false);
  } else {
    setBadge('// unknown', false);
  }
}

document.addEventListener('DOMContentLoaded', init);
