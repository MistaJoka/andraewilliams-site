/**
 * Tactical palette theme switcher — persists choice in localStorage.
 */

export const THEMES = [
  { slug: 'operator', name: 'Operator', vibe: 'Tactical command deck' },
  { slug: 'graphite-command-pro', name: 'Graphite Command Pro', vibe: 'Default command center' },
  { slug: 'graphite-command', name: 'Graphite Command', vibe: 'Modern technical sharp' },
  { slug: 'navy-forge', name: 'Navy Forge', vibe: 'Professional client-safe' },
  { slug: 'midnight-bronze', name: 'Midnight Bronze', vibe: 'Premium finance' },
  { slug: 'olive-operator', name: 'Olive Operator', vibe: 'Tactical ops' },
  { slug: 'plum-elegance', name: 'Plum Elegance', vibe: 'Restrained luxury' },
  { slug: 'steel-depth', name: 'Steel Depth', vibe: 'Cold infrastructure' },
  { slug: 'ember-drive', name: 'Ember Drive', vibe: 'Action and urgency' },
  { slug: 'forest-depth', name: 'Forest Depth', vibe: 'Grounded operations' },
  { slug: 'cyber-teal', name: 'Cyber Teal', vibe: 'Futuristic digital' },
  { slug: 'monochrome-elite', name: 'Monochrome Elite', vibe: 'Minimal professional' },
];

export const DEFAULT_THEME = 'graphite-command-pro';
const STORAGE_KEY = 'site-theme';

export function getTheme() {
  return document.documentElement.dataset.theme || DEFAULT_THEME;
}

export function setTheme(slug) {
  const theme = THEMES.some((t) => t.slug === slug) ? slug : DEFAULT_THEME;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  syncThemeControls(theme);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

function syncThemeControls(slug) {
  document.querySelectorAll('[data-theme-select]').forEach((el) => {
    if (el.tagName === 'SELECT') {
      el.value = slug;
    }
  });
}

function buildOptions(selected) {
  return THEMES.map(
    (t) => `<option value="${t.slug}"${t.slug === selected ? ' selected' : ''}>${t.name}</option>`
  ).join('');
}

function wireControl(root) {
  const select = root.querySelector('[data-theme-select]');
  if (!select) return;

  select.addEventListener('change', () => {
    setTheme(select.value);
  });

  syncThemeControls(getTheme());
}

export function mountThemeControl(container) {
  if (!container || container.dataset.themeMounted === 'true') return;

  const current = getTheme();
  container.innerHTML = `
    <div class="theme-control" role="group" aria-label="UI palette">
      <label class="theme-control-label" for="theme-select-${container.id || 'main'}">ui.palette</label>
      <select
        id="theme-select-${container.id || 'main'}"
        class="theme-control-select"
        data-theme-select
      >${buildOptions(current)}</select>
      <p class="theme-control-vibe" data-theme-vibe></p>
    </div>
  `;

  container.dataset.themeMounted = 'true';
  wireControl(container);
  updateVibeLabel(container, current);
}

function updateVibeLabel(container, slug) {
  const vibeEl = container.querySelector('[data-theme-vibe]');
  if (!vibeEl) return;
  const theme = THEMES.find((t) => t.slug === slug);
  vibeEl.textContent = theme ? theme.vibe : '';
}

function init() {
  document.querySelectorAll('[data-theme-mount]').forEach(mountThemeControl);

  window.addEventListener('themechange', (e) => {
    const slug = e.detail?.theme ?? getTheme();
    document.querySelectorAll('[data-theme-mount]').forEach((container) => {
      updateVibeLabel(container, slug);
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
