// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// `site` is required by @astrojs/sitemap to emit absolute URLs, and is
// what canonical/OG tags resolve against.
export default defineConfig({
  site: 'https://www.andraewilliams.com',
  integrations: [sitemap()],
});
