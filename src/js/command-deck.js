// Command-deck runtime: theme lock, Zulu clock, rail toggle, data panels, keyboard nav.

const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
const RAIL_STORAGE = 'site-sidebar';

// Deck pages always use the operator palette (no theme picker on deck yet).
if (document.body.classList.contains('deck-page')) {
  document.documentElement.dataset.theme = 'operator';
}

function applyMotion(reduced) {
  document.documentElement.dataset.motion = reduced ? 'reduce' : '';
}
applyMotion(reduceMq.matches);
if (reduceMq.addEventListener) {
  reduceMq.addEventListener('change', (event) => applyMotion(event.matches));
}

const clock = document.querySelector('#deck-clock');
function tick() {
  if (clock) clock.textContent = new Date().toISOString().slice(11, 19);
}
tick();
if (!reduceMq.matches) {
  setInterval(tick, 1000);
}

function initDeckRail() {
  const btn = document.querySelector('.deck-rail-toggle');
  if (!btn) return;

  const sync = () => {
    const expanded = document.documentElement.dataset.sidebar === 'expanded';
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    btn.setAttribute('aria-label', expanded ? 'Collapse rail' : 'Expand rail');
    btn.textContent = expanded ? '‹' : '›';
  };

  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.sidebar === 'expanded' ? 'collapsed' : 'expanded';
    document.documentElement.dataset.sidebar = next;
    localStorage.setItem(RAIL_STORAGE, next);
    sync();
  });
  sync();
}

const DEST = { h: 'index.html', a: 'about.html', t: 'tools.html' };
document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const tag = (event.target && event.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const target = DEST[event.key.toLowerCase()];
  if (target && !location.pathname.endsWith(target)) {
    location.href = target;
  }
});

function formatZuluDate(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${mm}.${dd}Z`;
}

function formatDeployed(iso) {
  if (!iso) return '—';
  return iso.slice(0, 16).replace('T', ' ') + 'Z';
}

function deckCell(content) {
  const span = document.createElement('span');
  if (content instanceof Node) span.appendChild(content);
  else if (typeof content === 'string' && content.includes('<')) span.innerHTML = content;
  else span.textContent = content ?? '';
  return span;
}

function deckRow(left, right) {
  const row = document.createElement('div');
  row.className = 'deck-row';
  row.append(deckCell(left), deckCell(right));
  return row;
}

function deckError(container, message) {
  container.replaceChildren();
  const span = document.createElement('span');
  span.className = 'deck-dim';
  span.textContent = message;
  container.appendChild(span);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function loadActiveOp() {
  const el = document.getElementById('deck-active-op');
  if (!el) return;
  try {
    const data = await fetchJson('data/mission.json');
    el.textContent = data.title || '—';
  } catch {
    el.textContent = 'mission: fetch failed';
  }
}

async function loadAssets() {
  const el = document.getElementById('deck-assets');
  if (!el) return;
  const countEl = document.getElementById('deck-assets-count');
  try {
    const data = await fetchJson('data/tools.manifest.json');
    const tools = data.tools || [];
    el.replaceChildren();
    tools.forEach((tool, index) => {
      const num = String(index + 1).padStart(2, '0');
      const name = document.createElement('a');
      name.href = tool.href || '#';
      if (tool.external) {
        name.target = '_blank';
        name.rel = 'noopener noreferrer';
      }
      name.textContent = `${num} ${tool.name}`;
      const status =
        tool.status === 'live'
          ? '<span class="deck-go">●</span>'
          : '<span class="deck-dim">○</span>';
      el.appendChild(deckRow(name, status));
    });
    const footer = document.createElement('a');
    footer.className = 'deck-armory-link';
    footer.href = 'tools.html';
    footer.textContent = 'ACCESS ARMORY →';
    el.appendChild(footer);
    if (countEl) countEl.textContent = `// ${tools.length} live`;
  } catch {
    deckError(el, '// fetch failed');
    if (countEl) countEl.textContent = '// unknown';
  }
}

async function loadSystems() {
  const el = document.getElementById('deck-systems');
  if (!el) return;
  try {
    const data = await fetchJson('data/site-status.json');
    const verify = data.verify ?? 'unknown';
    const verifyHtml =
      verify === 'pass'
        ? '<span class="deck-go">pass</span>'
        : `<span class="deck-dim">${verify}</span>`;
    el.replaceChildren(
      deckRow('deploy', '<span class="deck-go">vercel</span>'),
      deckRow('integrity', verifyHtml),
      deckRow('commit', `<span class="deck-dim">${data.commit ?? 'unknown'}</span>`),
      deckRow('tools', `<span class="deck-dim">${data.toolCount ?? '—'}</span>`),
      deckRow('deployed', `<span class="deck-dim">${formatDeployed(data.deployedAt)}</span>`),
      deckRow('scroll', '<span class="deck-go">locked</span>')
    );
  } catch {
    deckError(el, '// fetch failed');
  }
}

async function loadOpsLog() {
  const el = document.getElementById('deck-opslog');
  if (!el) return;
  try {
    const data = await fetchJson('data/field-notes.json');
    const notes = (data.notes || []).slice(0, 2);
    el.replaceChildren();
    notes.forEach((note) => {
      let title = note.title;
      if (note.href) {
        const a = document.createElement('a');
        a.href = note.href;
        if (note.href.startsWith('http')) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        a.textContent = note.title;
        title = a;
      }
      el.appendChild(
        deckRow(`<span class="deck-dim">${formatZuluDate(note.date)}</span>`, title)
      );
    });
  } catch {
    deckError(el, '// fetch failed');
  }
}

function renderToolTile(tool, index) {
  const num = String(index + 1).padStart(2, '0');
  const href = tool.writeup || tool.href || '#';
  const external = Boolean(tool.external) && !tool.writeup;
  const tile = document.createElement('a');
  tile.className = 'deck-tool-tile';
  tile.href = href;
  if (external) {
    tile.target = '_blank';
    tile.rel = 'noopener noreferrer';
  }
  tile.setAttribute('aria-label', `Open ${tool.name}`);

  const indexSpan = document.createElement('span');
  indexSpan.className = 'deck-tool-index';
  indexSpan.setAttribute('aria-hidden', 'true');
  indexSpan.textContent = num;

  const type = document.createElement('span');
  type.className = 'deck-dim deck-tool-type';
  type.textContent = tool.type || 'Tool';

  const name = document.createElement('span');
  name.className = 'deck-tool-name';
  name.textContent = tool.name;

  const status = document.createElement('span');
  status.className = tool.status === 'live' ? 'deck-go deck-tool-status' : 'deck-dim deck-tool-status';
  status.textContent = tool.status === 'live' ? '● live' : tool.status || 'static';

  const desc = document.createElement('p');
  desc.className = 'deck-tool-desc';
  desc.textContent = tool.description || tool.purpose || '';

  tile.append(indexSpan, type, name, status, desc);
  return tile;
}

async function loadToolsGrid() {
  const host = document.getElementById('deck-tools-active');
  if (!host) return;
  const loading = host.querySelector('.deck-tools-loading');
  try {
    const data = await fetchJson('data/tools.manifest.json');
    const tools = data.tools || [];
    if (loading) loading.remove();
    host.append(...tools.map(renderToolTile));
  } catch {
    if (loading) loading.textContent = '// fetch failed';
  }
}

function initHomePanels() {
  if (!document.getElementById('deck-assets')) return;
  loadActiveOp();
  loadAssets();
  loadSystems();
  loadOpsLog();
}

document.addEventListener('DOMContentLoaded', () => {
  initDeckRail();
  initHomePanels();
  loadToolsGrid();
});
