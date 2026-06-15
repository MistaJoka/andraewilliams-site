/**
 * Level 0 — one script file, many small jobs.
 * Each init* function is optional — it no-ops if its markup is not on the page.
 */

(function () {
  'use strict';

  var THEME_KEY = 'l0-theme';

  function initYear() {
    var yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }
  }

  function pageFile() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    var last = parts[parts.length - 1];
    if (!last || last === 'level-0') return 'index.html';
    return last;
  }

  function initNav() {
    var current = pageFile();
    document.querySelectorAll('.site-nav a').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      var target = href.split('/').pop() || 'index.html';
      var isHome = current === 'index.html' && (target === 'index.html' || target === '');
      var isMatch = target === current || isHome;
      if (isMatch) link.setAttribute('aria-current', 'page');
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
    var label = document.getElementById('theme-label');
    if (label) label.textContent = theme;
  }

  function initTheme() {
    var stored = localStorage.getItem(THEME_KEY);
    applyTheme(stored || systemTheme());

    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var current = document.documentElement.dataset.theme || systemTheme();
        applyTheme(current === 'dark' ? 'light' : 'dark');
        announce('Theme set to ' + document.documentElement.dataset.theme);
      });
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (!localStorage.getItem(THEME_KEY)) applyTheme(systemTheme());
    });
  }

  function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (root) {
      var tabs = root.querySelectorAll('[role="tab"]');
      var panels = root.querySelectorAll('[role="tabpanel"]');
      if (!tabs.length) return;

      function selectTab(tab) {
        tabs.forEach(function (t) {
          var selected = t === tab;
          t.setAttribute('aria-selected', selected ? 'true' : 'false');
          t.tabIndex = selected ? 0 : -1;
        });
        panels.forEach(function (panel) {
          panel.hidden = panel.id !== tab.getAttribute('aria-controls');
        });
      }

      tabs.forEach(function (tab, index) {
        tab.addEventListener('click', function () {
          selectTab(tab);
        });
        tab.addEventListener('keydown', function (e) {
          var next = index;
          if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
          else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
          else if (e.key === 'Home') next = 0;
          else if (e.key === 'End') next = tabs.length - 1;
          else return;
          e.preventDefault();
          selectTab(tabs[next]);
          tabs[next].focus();
        });
      });
    });
  }

  function initDialog() {
    document.querySelectorAll('[data-dialog-open]').forEach(function (btn) {
      var id = btn.getAttribute('data-dialog-open');
      var dialog = document.getElementById(id);
      if (!dialog || typeof dialog.showModal !== 'function') return;
      btn.addEventListener('click', function () {
        dialog.showModal();
      });
    });

    document.querySelectorAll('dialog[data-dialog]').forEach(function (dialog) {
      dialog.addEventListener('click', function (e) {
        if (e.target === dialog) dialog.close();
      });
      var closeBtn = dialog.querySelector('[data-dialog-close]');
      if (closeBtn) closeBtn.addEventListener('click', function () {
        dialog.close();
      });
    });
  }

  function initCopy() {
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.querySelector(btn.getAttribute('data-copy'));
        if (!target) return;
        var text = target.textContent || '';
        navigator.clipboard.writeText(text.trim()).then(function () {
          announce('Copied to clipboard');
          btn.textContent = 'Copied!';
          setTimeout(function () {
            btn.textContent = 'Copy snippet';
          }, 1600);
        }).catch(function () {
          announce('Copy failed — select the text manually');
        });
      });
    });
  }

  function initForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var success = document.getElementById('form-success');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (success) success.hidden = false;
      form.reset();
      announce('Form validated. Level 0 has no server — nothing was sent.');
    });
  }

  function initFetch() {
    var mount = document.getElementById('json-output');
    var countEl = document.getElementById('capability-count');

    function render(data) {
      if (mount) mount.textContent = JSON.stringify(data, null, 2);
      if (countEl && data.capabilities) countEl.textContent = String(data.capabilities.length);
      if (mount && data.capabilities) {
        announce('Loaded site.json — ' + data.capabilities.length + ' capabilities');
      }
    }

    if (mount) mount.textContent = 'Loading data/site.json…';

    fetch('data/site.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(render)
      .catch(function (err) {
        if (mount) mount.textContent = 'Could not load JSON: ' + err.message;
      });
  }

  function initLiveDemo() {
    var btn = document.getElementById('live-demo-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      announce('Live region working — screen readers heard this update.');
    });
  }

  function announce(message) {
    var region = document.getElementById('live-region');
    if (!region) return;
    region.textContent = '';
    window.setTimeout(function () {
      region.textContent = message;
    }, 40);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initYear();
    initNav();
    initTheme();
    initTabs();
    initDialog();
    initCopy();
    initForm();
    initFetch();
    initLiveDemo();
  });
})();
