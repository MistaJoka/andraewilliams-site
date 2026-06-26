(function () {
  'use strict';
  var THEME_KEY = 'l2-theme';
  var API = '/api/level-2/echo';

  function pageFile() {
    var path = window.location.pathname;
    if (path.indexOf('/level-2/') === 0) path = path.slice('/level-2/'.length);
    var parts = path.split('/').filter(Boolean);
    var last = parts[parts.length - 1];
    return !last || last === 'level-2' ? 'index.html' : last;
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
    var stored = localStorage.getItem(THEME_KEY);
    var theme = stored || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
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

  function initApiDemo() {
    var healthBtn = document.getElementById('health-btn');
    var healthOut = document.getElementById('health-output');
    var form = document.getElementById('echo-form');
    var echoOut = document.getElementById('echo-output');
    if (!healthBtn && !form) return;

    if (healthBtn) {
      healthBtn.addEventListener('click', function () {
        healthOut.textContent = 'Loading…';
        fetch(API)
          .then(function (r) { return r.json(); })
          .then(function (d) { healthOut.textContent = JSON.stringify(d, null, 2); })
          .catch(function (e) { healthOut.textContent = 'Error: ' + e.message; });
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var message = document.getElementById('message').value.trim();
        echoOut.textContent = 'Sending…';
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: message }),
        })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (res) {
            echoOut.textContent = JSON.stringify(res.d, null, 2);
            if (!res.ok) echoOut.textContent += '\n\n(Request failed — is the API deployed?)';
          })
          .catch(function (err) { echoOut.textContent = 'Error: ' + err.message; });
      });
    }
  }

  initNav();
  initTheme();
  initApiDemo();
})();
