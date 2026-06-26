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

function initViewTransitions() {
  if (reduceMq.matches || !document.startViewTransition) return;

  document.querySelectorAll('.deck-rail-link[href]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href || link.classList.contains('active')) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }
      event.preventDefault();
      document.startViewTransition(() => {
        location.href = href;
      });
    });
  });
}

function initSpeculation() {
  const primed = new Set();

  document.querySelectorAll('.deck-rail-link[href]').forEach((link) => {
    const url = link.getAttribute('href');
    if (!url) return;

    const prime = () => {
      if (primed.has(url)) return;
      primed.add(url);
      const script = document.createElement('script');
      script.type = 'speculationrules';
      script.textContent = JSON.stringify({
        prefetch: [{ source: 'list', urls: [url] }],
      });
      document.head.appendChild(script);
    };

    link.addEventListener('mouseenter', prime, { once: true });
    link.addEventListener('focus', prime, { once: true });
  });
}

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
      name.href = tool.writeup || tool.href || '#';
      if (tool.external && !tool.writeup) {
        name.target = '_blank';
        name.rel = 'noopener noreferrer';
      }
      const label = tool.external ? `${tool.name} ↗` : tool.name;
      name.textContent = `${num} ${label}`;
      const status =
        tool.status === 'live'
          ? '<span class="deck-go">●</span>'
          : '<span class="deck-dim">○</span>';
      el.appendChild(deckRow(name, status));
    });
    if (tools.length < 6) {
      const slotNum = String(tools.length + 1).padStart(2, '0');
      el.appendChild(
        deckRow(
          `<span class="deck-dim">${slotNum} NEXT SLOT // UNASSIGNED</span>`,
          '<span class="deck-dim">○</span>'
        )
      );
    }
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

function renderToolTile(tool, index, solo) {
  const num = String(index + 1).padStart(2, '0');
  const heroClass = solo ? 'deck-tool-tile deck-tool-tile--hero' : 'deck-tool-tile';

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

  const parts = [indexSpan, type, name, status, desc];

  if (tool.tags?.length) {
    const tags = document.createElement('span');
    tags.className = 'deck-dim deck-tool-tags';
    tags.textContent = tool.tags.join(' · ');
    parts.push(tags);
  }

  if (tool.writeup && tool.href) {
    const wrap = document.createElement('article');
    wrap.className = heroClass;

    const actions = document.createElement('div');
    actions.className = 'deck-tool-actions';
    const caseLink = document.createElement('a');
    caseLink.href = tool.writeup;
    caseLink.textContent = 'Case file →';
    const liveLink = document.createElement('a');
    liveLink.href = tool.href;
    if (tool.external) {
      liveLink.target = '_blank';
      liveLink.rel = 'noopener noreferrer';
    }
    liveLink.textContent = tool.external ? 'Live app ↗' : 'Open →';
    actions.append(caseLink, liveLink);
    parts.push(actions);
    wrap.append(...parts);
    return wrap;
  }

  const tile = document.createElement('a');
  tile.className = heroClass;
  tile.href = tool.writeup || tool.href || '#';
  if (tool.external) {
    tile.target = '_blank';
    tile.rel = 'noopener noreferrer';
  }
  tile.setAttribute('aria-label', `Open ${tool.name}`);
  tile.append(...parts);
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
    if (tools.length === 1) {
      host.classList.add('deck-active--tools-solo');
    }
    host.append(...tools.map((tool, index) => renderToolTile(tool, index, tools.length === 1)));

    if (tools.length < 4) {
      const placeholder = document.createElement('div');
      placeholder.className = 'deck-tool-slot deck-dim';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.textContent = `// SLOT ${String(tools.length + 1).padStart(2, '0')} UNASSIGNED`;
      host.appendChild(placeholder);
    }
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
  initViewTransitions();
  initSpeculation();
  initHomePanels();
  loadToolsGrid();
});
