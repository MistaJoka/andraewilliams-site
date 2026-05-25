/**
 * Renders arsenal cards from tools.manifest.json.
 */
const MANIFEST_URL = 'data/tools.manifest.json';

function statusClass(status) {
  if (status === 'live') return 'status-badge active';
  if (status === 'wip') return 'status-badge wip';
  return 'status-badge';
}

function renderCard(tool, index) {
  const card = document.createElement('article');
  card.className = 'tool-card home-arsenal-card';

  const idx = document.createElement('span');
  idx.className = 'tool-card-index';
  idx.setAttribute('aria-hidden', 'true');
  idx.textContent = String(index + 1).padStart(2, '0');

  const type = document.createElement('span');
  type.className = 'tool-type';
  type.textContent = tool.type || 'Tool';

  const header = document.createElement('div');
  header.className = 'tool-card-header';

  const name = document.createElement('span');
  name.className = 'tool-name';
  name.textContent = tool.name;

  const badge = document.createElement('span');
  badge.className = statusClass(tool.status);
  badge.textContent = tool.status || 'static';

  header.append(name, badge);

  const desc = document.createElement('p');
  desc.className = 'tool-desc';
  desc.textContent = tool.description || tool.purpose || '';

  const meta = document.createElement('div');
  meta.className = 'tool-card-meta';
  (tool.tags || []).forEach((tag) => {
    const span = document.createElement('span');
    span.textContent = tag;
    meta.appendChild(span);
  });

  const links = document.createElement('div');
  links.className = 'home-arsenal-links';

  const external = Boolean(tool.external);
  const href = tool.href || '#';

  const openLink = document.createElement('a');
  openLink.href = href;
  openLink.className = 'home-arsenal-link';
  openLink.textContent = external ? 'open ↗' : 'open →';
  if (external) {
    openLink.target = '_blank';
    openLink.rel = 'noopener noreferrer';
  }
  links.appendChild(openLink);

  if (tool.writeup) {
    const caseLink = document.createElement('a');
    caseLink.href = tool.writeup;
    caseLink.className = 'home-arsenal-link home-arsenal-link--muted';
    caseLink.textContent = 'case file →';
    links.appendChild(caseLink);
  }

  card.append(idx, type, header, desc, meta, links);
  return card;
}

async function init() {
  const grid = document.getElementById('arsenal-grid');
  const countEl = document.getElementById('arsenal-count');
  if (!grid) return;

  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const tools = data.tools || [];
    grid.replaceChildren(...tools.map(renderCard));
    if (countEl) countEl.textContent = `// ${tools.length} live`;
  } catch {
    grid.replaceChildren();
    const p = document.createElement('p');
    p.className = 'arsenal-error';
    p.textContent = 'arsenal: fetch failed';
    grid.appendChild(p);
    if (countEl) countEl.textContent = '// unknown';
  }
}

document.addEventListener('DOMContentLoaded', init);
