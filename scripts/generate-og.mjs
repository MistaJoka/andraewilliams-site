// Rasterize the OG source SVGs to 1200x630 PNGs.
// Social platforms (X, LinkedIn, Slack, iMessage) don't render SVG OG images,
// so we ship PNGs. Output is committed; this is just the regenerator.
// Run: npm run og
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ogDir = join(root, 'src', 'og');

const svgs = readdirSync(ogDir).filter((f) => f.endsWith('.svg'));
if (svgs.length === 0) {
  console.error('No SVGs found in', ogDir);
  process.exit(1);
}

for (const svg of svgs) {
  const out = svg.replace(/\.svg$/, '.png');
  await sharp(join(ogDir, svg), { density: 192 })
    .resize(1200, 630, { fit: 'fill' })
    .png()
    .toFile(join(ogDir, out));
  console.log(`og: ${svg} -> ${out}`);
}
