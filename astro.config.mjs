// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { remarkImageSize } from './src/lib/remark-image-size';

// https://astro.build/config
export default defineConfig({
  site: 'https://modern-jan.com',
  output: 'static',
  adapter: cloudflare({
    routes: {
      extend: {
        exclude: [
          { pattern: '/sitemap.xml' },
          { pattern: '/sitemap-*.xml' },
        ],
      },
    },
  }),
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [
      remarkImageSize,
    ],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'wrap' }],
    ],
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});