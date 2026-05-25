/**
 * Tactical sidebar rail — collapsed by default on desktop.
 */

const STORAGE_KEY = 'site-sidebar';
const DEFAULT_STATE = 'collapsed';

export function getSidebarState() {
  return document.documentElement.dataset.sidebar || DEFAULT_STATE;
}

export function setSidebarState(state) {
  const next = state === 'expanded' ? 'expanded' : 'collapsed';
  document.documentElement.dataset.sidebar = next;
  localStorage.setItem(STORAGE_KEY, next);
  syncToggleUi(next);
}

function syncToggleUi(state) {
  const expanded = state === 'expanded';
  document.querySelectorAll('[data-sidebar-toggle]').forEach((btn) => {
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    btn.setAttribute('aria-label', expanded ? 'Collapse rail' : 'Expand rail');
    const icon = btn.querySelector('.sidebar-toggle-icon');
    if (icon) icon.textContent = expanded ? '‹' : '›';
  });
}

function init() {
  document.querySelectorAll('[data-sidebar-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setSidebarState(getSidebarState() === 'expanded' ? 'collapsed' : 'expanded');
    });
  });
  syncToggleUi(getSidebarState());
}

document.addEventListener('DOMContentLoaded', init);
