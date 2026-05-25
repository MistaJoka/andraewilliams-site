import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Homepage Pretext card system — bundled for static GitHub Pages. */
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/js/pretext-card-system.js'),
      formats: ['es'],
      fileName: 'pretext-card-system',
    },
    outDir: resolve(__dirname, 'dist-card-system'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'pretext-card-system.js',
      },
    },
  },
});
