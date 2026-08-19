// ELI5: the URL bar is the app's memory. #/p/fire means "fire is open",
// an empty hash means "show the grid". Anyone can copy the link and land
// on the same view, and Back/Forward work for free.
//
// Why the hash and not real paths: vercel.json rewrites every path to
// index.html, so /p/fire would serve the homepage with no way to tell
// the difference — and a wrong URL would 200 instead of 404. Everything
// after the # never reaches the server, so there is nothing to configure
// and nothing to get wrong.

const PREFIX = '#/p/';

// '#/p/rule-30' -> 'rule-30'; anything else -> null (meaning: the grid).
export function parseHash(hash = window.location.hash) {
  if (!hash.startsWith(PREFIX)) return null;
  const slug = decodeURIComponent(hash.slice(PREFIX.length)).trim();
  return slug || null;
}

const handlers = new Set();

function notify() {
  const slug = parseHash();
  for (const handler of handlers) handler(slug);
}

// Writes the hash. `replace` is used for corrections (e.g. an unknown
// slug) so Back doesn't bounce the visitor into the bad URL again.
//
// GOTCHA: pushState/replaceState change the URL *silently* — neither
// fires hashchange nor popstate. So this notifies subscribers directly;
// without that, clicking a tile would rewrite the address bar and
// nothing on screen would move.
export function setHash(slug, { replace = false } = {}) {
  const url = slug
    ? PREFIX + encodeURIComponent(slug)
    : window.location.pathname + window.location.search;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  notify();
}

// Calls back with the current slug (or null) now and on every change:
// programmatic (setHash), Back/Forward (popstate), and a hand-edited
// address bar (hashchange).
export function onRoute(handler) {
  handlers.add(handler);
  window.addEventListener('hashchange', notify);
  window.addEventListener('popstate', notify);
  handler(parseHash());
}
