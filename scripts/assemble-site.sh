#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build:pretext

mkdir -p _site
rsync -a --exclude 'pretext-smoke' src/ _site/
mkdir -p _site/pretext-smoke
rsync -a dist-pretext/ _site/pretext-smoke/

echo "Assembled site at _site/"
