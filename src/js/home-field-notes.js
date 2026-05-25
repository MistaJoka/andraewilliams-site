/**
 * Renders field.notes case-file cards from field-notes.json.
 */
const NOTES_URL = 'data/field-notes.json';

function renderNote(note) {
  const card = document.createElement('article');
  card.className = 'glass-card field-note-card';

  const date = document.createElement('time');
  date.className = 'field-note-date';
  date.dateTime = note.date;
  date.textContent = note.date;

  const title = document.createElement('h3');
  title.className = 'field-note-title';
  title.textContent = note.title;

  const summary = document.createElement('p');
  summary.className = 'field-note-summary';
  summary.textContent = note.summary;

  const tags = document.createElement('div');
  tags.className = 'field-note-tags';
  (note.tags || []).forEach((tag) => {
    const span = document.createElement('span');
    span.textContent = tag;
    tags.appendChild(span);
  });

  card.append(date, title, summary, tags);

  if (note.href) {
    const link = document.createElement('a');
    link.className = 'field-note-link';
    link.href = note.href;
    if (note.href.startsWith('http')) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'read more ↗';
    } else {
      link.textContent = 'case file →';
    }
    card.appendChild(link);
  }

  return card;
}

async function init() {
  const grid = document.getElementById('field-notes-grid');
  if (!grid) return;

  try {
    const res = await fetch(NOTES_URL);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const notes = data.notes || [];
    grid.replaceChildren(...notes.map(renderNote));
  } catch {
    grid.replaceChildren();
    const p = document.createElement('p');
    p.className = 'notes-error';
    p.textContent = 'field.notes: fetch failed';
    grid.appendChild(p);
  }
}

document.addEventListener('DOMContentLoaded', init);
