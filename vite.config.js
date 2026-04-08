import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Pretext smoke app: dev at `/`, production build for GitHub Pages at `/pretext-smoke/`. */
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pretext-smoke/' : '/',
  root: resolve(__dirname, 'src/pretext-smoke'),
  server: {
    port: 5173,
  },
  build: {
    outDir: resolve(__dirname, 'dist-pretext'),
    emptyOutDir: true,
  },
}));
