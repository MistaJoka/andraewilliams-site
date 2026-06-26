(function () {
  'use strict';
  var THEME_KEY = 'l3-theme';
  var API = '/api/level-3/notes';
  var DEMO_KEY = 'level3-demo-notes';

  function pageFile() {
    var path = window.location.pathname;
    if (path.indexOf('/level-3/') === 0) path = path.slice('/level-3/'.length);
    var parts = path.split('/').filter(Boolean);
    var last = parts[parts.length - 1];
    return !last || last === 'level-3' ? 'index.html' : last;
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

  function demoNotes() {
    try {
      return JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveDemoNote(note) {
    var notes = demoNotes();
    notes.unshift(note);
    localStorage.setItem(DEMO_KEY, JSON.stringify(notes.slice(0, 50)));
  }

  function renderNotes(notes) {
    var list = document.getElementById('note-list');
    if (!list) return;
    if (!notes.length) {
      list.innerHTML = '<li>No notes yet.</li>';
      return;
    }
    list.innerHTML = notes
      .map(function (n) {
        var when = n.created_at ? new Date(n.created_at).toLocaleString() : '';
        return '<li><p>' + escapeHtml(n.body) + '</p><time datetime="' + escapeHtml(n.created_at || '') + '">' + escapeHtml(when) + '</time></li>';
      })
      .join('');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setMode(mode) {
    var badge = document.getElementById('mode-badge');
    var banner = document.getElementById('mode-banner');
    if (badge) badge.textContent = mode === 'live' ? 'Live · Supabase' : 'Demo · localStorage';
    if (banner && mode === 'demo') {
      banner.hidden = false;
      banner.textContent = 'Demo mode: notes you add are stored in this browser only. Add Supabase env vars for shared persistence.';
    }
  }

  function loadNotes() {
    fetch(API)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        setMode(data.mode || 'demo');
        var notes = data.notes || [];
        if (data.mode === 'demo') {
          var local = demoNotes();
          notes = local.concat(notes);
        }
        renderNotes(notes);
      })
      .catch(function () {
        setMode('demo');
        renderNotes(demoNotes());
      });
  }

  function initGuestbook() {
    var form = document.getElementById('note-form');
    if (!form) return;
    loadNotes();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var body = document.getElementById('body').value.trim();
      if (!body) return;
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.mode === 'demo' && data.note) saveDemoNote(data.note);
          document.getElementById('body').value = '';
          loadNotes();
        })
        .catch(function () {
          var note = { id: 'local', body: body, created_at: new Date().toISOString() };
          saveDemoNote(note);
          document.getElementById('body').value = '';
          loadNotes();
        });
    });
  }

  initNav();
  initTheme();
  initGuestbook();
})();
