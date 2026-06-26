(function () {
  'use strict';
  var THEME_KEY = 'l1-theme';

  function pageFile() {
    var path = window.location.pathname;
    if (path.indexOf('/level-1/') === 0) path = path.slice('/level-1/'.length);
    var parts = path.split('/').filter(Boolean);
    var last = parts[parts.length - 1];
    if (!last || last === 'level-1') return 'index.html';
    return last;
  }

  function initNav() {
    var current = pageFile();
    document.querySelectorAll('.site-nav a').forEach(function (link) {
      var slug = link.getAttribute('data-nav');
      var match = (slug === 'index' && current === 'index.html') || slug + '.html' === current;
      if (match) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function systemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      btn.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    });
  }

  function initTheme() {
    applyTheme(localStorage.getItem(THEME_KEY) || systemTheme());
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cur = document.documentElement.dataset.theme || systemTheme();
        applyTheme(cur === 'dark' ? 'light' : 'dark');
      });
    });
  }

  function initMeta() {
    var out = document.getElementById('meta-output');
    var commitEl = document.getElementById('build-commit');
    if (!out && !commitEl) return;
    fetch('data/site-meta.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (out) out.textContent = JSON.stringify(data, null, 2);
        if (commitEl) commitEl.textContent = data.commit || 'unknown';
      })
      .catch(function () {
        if (out) out.textContent = 'Could not load site-meta.json — run build-level-1.mjs first.';
      });
  }

  initNav();
  initTheme();
  initMeta();
})();
