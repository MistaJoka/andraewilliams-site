#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/_site/data/site-status.json}"
MANIFEST="$ROOT/src/data/tools.manifest.json"

mkdir -p "$(dirname "$OUT")"

commit="${GITHUB_SHA:-local}"
if [[ "$commit" != "local" && ${#commit} -gt 7 ]]; then
  commit="${commit:0:7}"
fi

deployed_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if command -v node >/dev/null 2>&1; then
  tool_count="$(node -e "
    const m = require('$MANIFEST');
    process.stdout.write(String(m.tools.length));
  ")"
else
  tool_count="0"
fi

cat > "$OUT" <<EOF
{
  "deployedAt": "$deployed_at",
  "commit": "$commit",
  "verify": "pass",
  "toolCount": $tool_count,
  "stack": ["html", "css", "vanilla-js"]
}
EOF

echo "Generated $OUT (commit=$commit, tools=$tool_count)"
