#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p src/data
cp docs/decisions.md src/data/decisions.md

# rsync is unavailable on Vercel's build image; use cp (coreutils) instead.
# Start clean so stale files from a previous build don't linger.
rm -rf _site
mkdir -p _site
cp -R src/. _site/

mkdir -p _site/data
cp src/data/tools.manifest.json _site/data/
cp src/data/mission.json _site/data/
cp src/data/field-notes.json _site/data/
cp src/data/lab.json _site/data/
cp docs/decisions.md _site/data/decisions.md
bash scripts/generate-site-status.sh _site/data/site-status.json

echo "Assembled site at _site/"
