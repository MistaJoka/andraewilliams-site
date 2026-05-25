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

function renderTags(tags) {
  const wrap = document.createElement('div');
  wrap.className = 'lab-card-tags';
  (tags || []).forEach((tag) => {
    const span = document.createElement('span');
    span.textContent = tag;
    wrap.appendChild(span);
  });
  return wrap;
}

function renderPretextBadges() {
  const wrap = document.createElement('div');
  wrap.className = 'pretext-badges';
  wrap.setAttribute('aria-label', 'Text measurement status');
  wrap.innerHTML = `
    <span class="pretext-badge pretext-badge--measured" data-badge="measured">MEASURED</span>
    <span class="pretext-badge pretext-badge--safe" data-badge="safe" hidden>SAFE</span>
    <span class="pretext-badge pretext-badge--overflow" data-badge="overflow" hidden>OVERFLOW RISK</span>
    <span class="pretext-badge pretext-badge--responsive" data-badge="responsive">RESPONSIVE</span>
  `;
  return wrap;
}

function renderProofPanel(item) {
  const proof = item.pretext?.proof;
  if (!proof) return null;

  const panel = document.createElement('div');
  panel.className = 'project-card-proof';
  panel.hidden = true;
  panel.id = `proof-${item.id}`;

  const proves = (proof.proves || [])
    .map((line) => `<li>${line}</li>`)
    .join('');
  const edges = (proof.edgeCases || [])
    .map((line) => `<li>${line}</li>`)
    .join('');

  panel.innerHTML = `
    <p class="project-card-proof-label">What this proves</p>
    ${proves ? `<ul class="project-card-proof-list">${proves}</ul>` : ''}
    <dl class="project-card-proof-meta">
      <div><dt>Problem</dt><dd>${proof.problem || ''}</dd></div>
      <div><dt>Concept</dt><dd>${proof.concept || ''}</dd></div>
      <div><dt>Why it matters</dt><dd>${proof.why || ''}</dd></div>
    </dl>
    ${edges ? `<p class="project-card-proof-label">Edge cases</p><ul class="project-card-proof-list">${edges}</ul>` : ''}
    ${proof.meta ? `<p class="project-card-proof-meta-note">${proof.meta}</p>` : ''}
    <p class="project-card-proof-label">Live reading</p>
    <ul class="project-card-proof-reading project-card-proof-list"></ul>
  `;
  return panel;
}

function renderDemonstrationCard(item) {
  const p = item.pretext || {};
  const card = document.createElement('article');
  card.className = 'lab-card project-card';
  card.dataset.pretextCard = '';
  card.dataset.titleMaxLines = String(p.titleMaxLines ?? 2);
  card.dataset.descriptionMaxLines = String(p.descriptionMaxLines ?? 4);
  card.dataset.pretextTitle = item.name || '';
  card.dataset.pretextBody = item.note || '';

  const header = document.createElement('div');
  header.className = 'lab-card-head';

  const name = document.createElement('h3');
  name.className = 'lab-card-name';
  name.textContent = item.name;

  const statusWrap = document.createElement('div');
  statusWrap.className = 'project-card-status-wrap';
  const badge = document.createElement('span');
  badge.className = statusClass(item.status);
  badge.textContent = item.status || 'live';
  statusWrap.append(badge, renderPretextBadges());
  header.append(name, statusWrap);

  if (item.subtitle) {
    const subtitle = document.createElement('p');
    subtitle.className = 'lab-card-subtitle';
    subtitle.textContent = item.subtitle;
    card.appendChild(subtitle);
  }

  const note = document.createElement('p');
  note.className = 'lab-card-note';
  note.textContent = item.note;
  card.appendChild(note);

  if (item.concept) {
    const concept = document.createElement('p');
    concept.className = 'project-card-concept';
    concept.innerHTML = `<span class="project-card-concept-label">Concept:</span> ${item.concept}`;
    card.appendChild(concept);
  }

  if (item.apis?.length) {
    const apis = document.createElement('div');
    apis.className = 'project-card-apis';
    item.apis.forEach((api) => {
      const code = document.createElement('code');
      code.textContent = api;
      apis.appendChild(code);
    });
    card.appendChild(apis);
  }

  const reading = document.createElement('p');
  reading.className = 'pretext-reading';
  reading.textContent = 'Measuring…';
  card.appendChild(reading);

  card.appendChild(renderTags(item.tags));

  const actions = document.createElement('div');
  actions.className = 'project-card-actions';

  if (item.href) {
    const demo = document.createElement('a');
    demo.href = item.href;
    demo.className = 'project-card-action project-card-action--primary';
    demo.textContent = 'Open Demo';
    actions.appendChild(demo);
  }

  if (item.source) {
    const source = document.createElement('a');
    source.href = item.source;
    source.className = 'project-card-action';
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = 'View Source';
    actions.appendChild(source);
  }

  if (item.pretext?.proof) {
    const explain = document.createElement('button');
    explain.type = 'button';
    explain.className = 'project-card-action project-card-action--ghost';
    explain.dataset.proofToggle = '';
    explain.setAttribute('aria-expanded', 'false');
    explain.setAttribute('aria-controls', `proof-${item.id}`);
    explain.textContent = 'Explain';
    actions.appendChild(explain);
  }

  card.appendChild(actions);

  const proofPanel = renderProofPanel(item);
  if (proofPanel) card.appendChild(proofPanel);

  return card;
}

function renderToggleCard(item) {
  const card = document.createElement('article');
  card.className = 'lab-card lab-card--toggle';
  if (item.pretext?.enabled) {
    card.classList.add('project-card');
    card.dataset.pretextCard = '';
    card.dataset.titleMaxLines = String(item.pretext.titleMaxLines ?? 1);
    card.dataset.descriptionMaxLines = String(item.pretext.descriptionMaxLines ?? 2);
    card.dataset.pretextTitle = item.name || '';
    card.dataset.pretextBody = item.note || '';
  }

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

  if (item.pretext?.enabled) {
    header.appendChild(renderPretextBadges());
    const reading = document.createElement('p');
    reading.className = 'pretext-reading';
    reading.textContent = 'Measuring…';
    card.append(header, note, reading, renderTags(item.tags), action);
  } else {
    card.append(header, note, renderTags(item.tags), action);
  }

  return card;
}

function renderLinkCard(item) {
  if (item.pretext?.enabled) return renderDemonstrationCard(item);

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

  const cta = document.createElement('span');
  cta.className = 'lab-card-cta';
  cta.textContent = 'open →';

  card.append(header, note, renderTags(item.tags), cta);
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
