#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/_site"

required=(
  "index.html"
  "tools.html"
  "about.html"
  "CNAME"
  "pretext-smoke/index.html"
)

missing=0
for path in "${required[@]}"; do
  if [[ ! -f "$SITE/$path" ]]; then
    echo "Missing required site file: $path" >&2
    missing=$((missing + 1))
  fi
done

if [[ "$missing" -gt 0 ]]; then
  echo "Site verification failed ($missing missing)." >&2
  exit 1
fi

echo "Site verification passed (${#required[@]} required paths)."
