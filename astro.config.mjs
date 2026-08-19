// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// `site` is required by @astrojs/sitemap and by the RSS feed to emit
// absolute URLs. It is also what canonical/OG tags are resolved against.
export default defineConfig({
  site: 'https://www.andraewilliams.com',
  integrations: [mdx(), sitemap()],
});
