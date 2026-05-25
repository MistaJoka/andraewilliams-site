/**
 * Renders lab workshop cards from lab.json.
 */
import { initSmokeHome } from './smoke-home.js';

const LAB_URL = 'data/lab.json';

function statusClass(status) {
  if (status === 'live') return 'status-badge active';
  if (status === 'experiment') return 'status-badge wip';
  return 'status-badge';
}

function renderToggleCard(item) {
  const card = document.createElement('article');
  card.className = 'lab-card lab-card--toggle';

  const header = document.createElement('div');
  header.className = 'lab-card-head';

  const name = document.createElement('h3');
  name.className = 'lab-card-name';
  name.textContent = item.name;

  const badge = document.createElement('span');
  badge.className = statusClass(item.status);
  badge.textContent = item.status || 'experiment';

  header.append(name, badge);

  const note = document.createElement('p');
  note.className = 'lab-card-note';
  note.textContent = item.note;

  const tags = document.createElement('div');
  tags.className = 'lab-card-tags';
  (item.tags || []).forEach((tag) => {
    const span = document.createElement('span');
    span.textContent = tag;
    tags.appendChild(span);
  });

  const action = document.createElement('div');
  action.className = 'lab-card-action';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'smoke-toggle';
  toggle.className = 'smoke-toggle lab-smoke-toggle';
  toggle.setAttribute('aria-pressed', 'false');
  toggle.setAttribute('aria-label', 'Toggle smoke effect');
  toggle.innerHTML = `
    <svg class="smoke-toggle-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 23a7 7 0 006-7c0-2.5-1-4.5-3-6C14 6.5 12 2 12 2S10 6.5 9 10c-2 1.5-3 3.5-3 6a7 7 0 006 7z"/>
    </svg>
    <span class="lab-smoke-label">Enable ambient smoke</span>
  `;

  action.appendChild(toggle);
  card.append(header, note, tags, action);
  return card;
}

function renderLinkCard(item) {
  const card = document.createElement('a');
  card.className = 'lab-card lab-card--link';
  card.href = item.href || '#';

  const header = document.createElement('div');
  header.className = 'lab-card-head';

  const name = document.createElement('h3');
  name.className = 'lab-card-name';
  name.textContent = item.name;

  const badge = document.createElement('span');
  badge.className = statusClass(item.status);
  badge.textContent = item.status || 'live';

  header.append(name, badge);

  const note = document.createElement('p');
  note.className = 'lab-card-note';
  note.textContent = item.note;

  const tags = document.createElement('div');
  tags.className = 'lab-card-tags';
  (item.tags || []).forEach((tag) => {
    const span = document.createElement('span');
    span.textContent = tag;
    tags.appendChild(span);
  });

  const cta = document.createElement('span');
  cta.className = 'lab-card-cta';
  cta.textContent = 'open →';

  card.append(header, note, tags, cta);
  return card;
}

function renderItem(item) {
  if (item.toggle) return renderToggleCard(item);
  return renderLinkCard(item);
}

async function init() {
  const grid = document.getElementById('lab-grid');
  if (!grid) return;

  try {
    const res = await fetch(LAB_URL);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const items = data.items || [];
    grid.replaceChildren(...items.map(renderItem));
    initSmokeHome();
    document.dispatchEvent(new CustomEvent('lab-ready'));
  } catch {
    grid.replaceChildren();
    const p = document.createElement('p');
    p.className = 'lab-error';
    p.textContent = 'lab: fetch failed';
    grid.appendChild(p);
  }
}

document.addEventListener('DOMContentLoaded', init);
