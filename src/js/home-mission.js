/**
 * Renders current.mission from mission.json.
 */
const MISSION_URL = 'data/mission.json';

function focusTag(text) {
  const span = document.createElement('span');
  span.className = 'mission-focus-tag';
  span.textContent = text;
  return span;
}

function renderMission(data) {
  const card = document.getElementById('mission-card');
  if (!card) return;

  card.replaceChildren();

  const head = document.createElement('div');
  head.className = 'mission-head';

  const title = document.createElement('h3');
  title.className = 'mission-title';
  title.textContent = data.title;

  const status = document.createElement('span');
  status.className = `mission-status mission-status--${data.status || 'active'}`;
  status.textContent = data.status || 'active';

  head.append(title, status);

  const summary = document.createElement('p');
  summary.className = 'mission-summary';
  summary.textContent = data.summary;

  const focusWrap = document.createElement('div');
  focusWrap.className = 'mission-focus';
  const focusLabel = document.createElement('span');
  focusLabel.className = 'mission-focus-label';
  focusLabel.textContent = 'focus:';
  focusWrap.appendChild(focusLabel);
  (data.focus || []).forEach((item) => focusWrap.appendChild(focusTag(item)));

  const updated = document.createElement('p');
  updated.className = 'mission-updated';
  updated.textContent = `updated: ${data.updated || 'unknown'}`;

  card.append(head, summary, focusWrap, updated);
}

function renderError() {
  const card = document.getElementById('mission-card');
  if (!card) return;
  card.replaceChildren();
  const p = document.createElement('p');
  p.className = 'mission-error';
  p.textContent = 'mission: fetch failed';
  card.appendChild(p);
}

async function init() {
  try {
    const res = await fetch(MISSION_URL);
    if (!res.ok) throw new Error(String(res.status));
    renderMission(await res.json());
  } catch {
    renderError();
  }
}

document.addEventListener('DOMContentLoaded', init);
