(function () {
  'use strict';
  var THEME_KEY = 'l4-theme';

  function pageFile() {
    var path = window.location.pathname;
    if (path.indexOf('/level-4/') === 0) path = path.slice('/level-4/'.length);
    var parts = path.split('/').filter(Boolean);
    var last = parts[parts.length - 1];
    return !last || last === 'level-4' ? 'index.html' : last;
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

  function initTheme() {
    var theme = localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
      btn.addEventListener('click', function () {
        theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(THEME_KEY, theme);
        btn.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
      });
    });
  }

  initNav();
  initTheme();
})();
