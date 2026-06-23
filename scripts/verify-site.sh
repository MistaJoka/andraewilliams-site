#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/_site"
MANIFEST="$ROOT/src/data/tools.manifest.json"
TOOLS_HTML="$ROOT/src/tools.html"

missing=0
for path in \
  "index.html" \
  "404.html" \
  "tools.html" \
  "about.html" \
  "CNAME" \
  "pretext-smoke/index.html" \
  "data/site-status.json" \
  "data/tools.manifest.json" \
  "data/mission.json" \
  "data/field-notes.json" \
  "data/lab.json" \
  "data/decisions.md" \
  "level-0/index.html" \
  "level-0/about.html" \
  "level-0/showcase.html" \
  "level-0/contact.html" \
  "level-0/style.css" \
  "level-0/script.js" \
  "level-0/data/site.json"
do
  if [[ ! -f "$SITE/$path" ]]; then
    echo "Missing required site file: $path" >&2
    missing=$((missing + 1))
  fi
done

if [[ -f "$MANIFEST" && -f "$TOOLS_HTML" ]] && command -v node >/dev/null 2>&1; then
  node -e "
    const fs = require('fs');
    const manifest = JSON.parse(fs.readFileSync('$MANIFEST', 'utf8'));
    const toolsHtml = fs.readFileSync('$TOOLS_HTML', 'utf8');
    const count = manifest.tools.length;
    const match = toolsHtml.match(/\\/\\/\\s*(\\d+)\\s+live\\s+builds/i);
    if (!match) {
      console.error('tools.html missing live build count comment');
      process.exit(1);
    }
    if (Number(match[1]) !== count) {
      console.error('Manifest tool count (' + count + ') does not match tools.html (' + match[1] + ')');
      process.exit(1);
    }
    console.log('Manifest drift check passed (' + count + ' tools).');
  " || missing=$((missing + 1))
fi

if [[ "$missing" -gt 0 ]]; then
  echo "Site verification failed ($missing issue(s))." >&2
  exit 1
fi

echo "Site verification passed."
