#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build:pretext

mkdir -p src/data
cp docs/decisions.md src/data/decisions.md

mkdir -p _site
rsync -a --exclude 'pretext-smoke' src/ _site/
mkdir -p _site/pretext-smoke
rsync -a dist-pretext/ _site/pretext-smoke/

mkdir -p _site/data
cp src/data/tools.manifest.json _site/data/
cp src/data/mission.json _site/data/
cp src/data/field-notes.json _site/data/
cp src/data/lab.json _site/data/
cp docs/decisions.md _site/data/decisions.md
bash scripts/generate-site-status.sh _site/data/site-status.json

echo "Assembled site at _site/"
