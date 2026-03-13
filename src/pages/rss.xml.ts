import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  if (!context.site) {
    throw new Error('site is required in astro.config.mjs for RSS feed generation');
  }

  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());

  return rss({
    title: 'モダンジャン研究会',
    description: '麻雀の戦術・技術について研究するサークル',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishedAt,
      description: post.data.description || '',
      link: `/blog/${post.slug}/`,
      categories: post.data.tags,
    })),
    customData: '<language>ja</language>',
  });
}
