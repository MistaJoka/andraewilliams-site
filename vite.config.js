import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Local-only Pretext smoke app (not deployed; see deploy workflow). */
export default defineConfig({
  root: resolve(__dirname, 'src/pretext-smoke'),
  server: {
    port: 5173,
  },
  build: {
    outDir: resolve(__dirname, 'dist-pretext'),
    emptyOutDir: true,
  },
});
