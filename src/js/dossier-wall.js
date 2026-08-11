/** Renders the mission dossier wall from data/dossiers.json. */
const DATA_URL = 'data/dossiers.json';

let all = [];

function card(d) {
  const el = document.createElement('article');
  el.className = `dossier-card tier-${d.tier} class-${d.class}`;
  el.dataset.class = d.class;

  const head = document.createElement('header');
  const codename = document.createElement('h2');
  codename.className = 'dossier-codename';
  codename.textContent = d.codename;
  const status = document.createElement('span');
  status.className = `dossier-status status-${d.status}`;
  status.textContent = d.status.toUpperCase();
  head.append(codename, status);

  const brief = document.createElement('p');
  brief.className = 'dossier-brief';
  brief.textContent = d.brief;

  const meta = document.createElement('p');
  meta.className = 'dossier-meta';
  const bits = [d.class.toUpperCase()];
  if (d.meta && d.meta.language) bits.push(d.meta.language);
  if (d.redaction === 'sanitized') bits.push('SANITIZED');
  else if (d.redaction === 'no-code-link') bits.push('PRIVATE BUILD');
  meta.textContent = `// ${bits.join(' · ')}`;

  const links = document.createElement('p');
  links.className = 'dossier-links';
  const linkDefs = [
    ['repo', 'source ↗', true],
    ['demo', 'live ↗', true],
    ['writeup', 'case file', false],
  ];
  for (const [key, label, external] of linkDefs) {
    if (!d.links || !d.links[key]) continue;
    const a = document.createElement('a');
    a.href = d.links[key];
    a.textContent = label;
    if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    if (links.childNodes.length) links.appendChild(document.createTextNode(' · '));
    links.appendChild(a);
  }

  el.append(head, brief, meta);
  if (links.childNodes.length) el.appendChild(links);
  return el;
}

function render(filterClass) {
  const featured = document.getElementById('featured-grid');
  const listed = document.getElementById('listed-grid');
  const countEl = document.getElementById('dossier-count');
  const visible = all.filter((d) => filterClass === 'all' || d.class === filterClass);
  featured.replaceChildren(...visible.filter((d) => d.tier === 'featured').map(card));
  listed.replaceChildren(...visible.filter((d) => d.tier === 'listed').map(card));
  if (countEl) countEl.textContent = `// ${visible.length} dossiers on file`;
}

async function init() {
  const featured = document.getElementById('featured-grid');
  if (!featured) return;
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(String(res.status));
    all = (await res.json()).dossiers || [];
    render('all');
  } catch {
    const countEl = document.getElementById('dossier-count');
    if (countEl) countEl.textContent = '// dossier retrieval failed';
    return;
  }
  document.getElementById('dossier-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.dossier-filter');
    if (!btn) return;
    document.querySelectorAll('.dossier-filter').forEach((b) => b.classList.toggle('active', b === btn));
    render(btn.dataset.class);
  });
}

document.addEventListener('DOMContentLoaded', init);
