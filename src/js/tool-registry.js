/**
 * Renders tool.registry from tools.manifest.json.
 */
const MANIFEST_URL = 'data/tools.manifest.json';

function statusClass(status) {
  if (status === 'live') return 'status-badge active';
  if (status === 'wip') return 'status-badge wip';
  return 'status-badge';
}

function renderRow(tool, index) {
  const tr = document.createElement('tr');
  const external = Boolean(tool.external);
  const href = tool.href || '#';

  const idx = document.createElement('td');
  idx.className = 'registry-idx';
  idx.textContent = String(index + 1).padStart(2, '0');

  const name = document.createElement('td');
  name.className = 'registry-name';
  name.textContent = tool.name;

  const status = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = statusClass(tool.status);
  badge.textContent = tool.status || 'static';
  status.appendChild(badge);

  const tags = document.createElement('td');
  tags.className = 'registry-tags';
  tags.textContent = (tool.tags || []).join(' · ');

  const link = document.createElement('td');
  link.className = 'registry-link';
  const a = document.createElement('a');
  a.href = href;
  a.textContent = external ? 'open ↗' : 'open';
  if (external) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  link.appendChild(a);

  if (tool.writeup) {
    const writeup = document.createElement('a');
    writeup.href = tool.writeup;
    writeup.className = 'registry-writeup';
    writeup.textContent = 'case file';
    link.appendChild(document.createTextNode(' · '));
    link.appendChild(writeup);
  }

  tr.append(idx, name, status, tags, link);
  return tr;
}

async function init() {
  const body = document.getElementById('registry-body');
  const countEl = document.getElementById('registry-count');
  if (!body) return;

  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const tools = data.tools || [];
    body.replaceChildren(...tools.map(renderRow));
    if (countEl) countEl.textContent = `// ${tools.length} live`;
  } catch {
    body.replaceChildren();
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'registry-error';
    td.textContent = 'registry: fetch failed';
    tr.appendChild(td);
    body.appendChild(tr);
    if (countEl) countEl.textContent = '// unknown';
  }
}

document.addEventListener('DOMContentLoaded', init);
