import { parseStringPromise } from 'xml2js';
import TurndownService from 'turndown';
import * as fs from 'fs/promises';
import * as path from 'path';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

interface WPPost {
  title: string;
  slug: string;
  date: string;
  content: string;
  categories: string[];
  tags: string[];
  status: string;
}

interface Redirect {
  from: string;
  to: string;
}

interface MahjongTileCandidate {
  postTitle: string;
  postSlug: string;
  imageUrl: string;
  tileName: string;
}

async function parseWordPressXML(xmlPath: string): Promise<WPPost[]> {
  const xml = await fs.readFile(xmlPath, 'utf-8');
  const result = await parseStringPromise(xml);

  const items = result.rss.channel[0].item || [];

  return items
    .filter((item: any) => item['wp:post_type']?.[0] === 'post')
    .filter((item: any) => item['wp:status']?.[0] === 'publish')
    .map((item: any) => ({
      title: item.title[0],
      slug: item['wp:post_name'][0],
      date: item['wp:post_date'][0],
      content: item['content:encoded']?.[0] || '',
      categories: item.category
        ?.filter((c: any) => c.$.domain === 'category')
        ?.map((c: any) => c._) || [],
      tags: item.category
        ?.filter((c: any) => c.$.domain === 'post_tag')
        ?.map((c: any) => c._) || [],
      status: item['wp:status'][0],
    }));
}

function preserveYouTubeEmbeds(html: string): string {
  const youtubeRegex = /<iframe[^>]*src="https:\/\/www\.youtube\.com\/embed\/[^"]*"[^>]*><\/iframe>/g;

  const placeholders: string[] = [];
  html = html.replace(youtubeRegex, (match) => {
    placeholders.push(match);
    return `__YOUTUBE_EMBED_${placeholders.length - 1}__`;
  });

  return html;
}

function restoreYouTubeEmbeds(markdown: string, placeholders: string[]): string {
  placeholders.forEach((iframe, index) => {
    markdown = markdown.replace(`__YOUTUBE_EMBED_${index}__`, iframe);
  });
  return markdown;
}

function preserveGoogleSheets(html: string): string {
  const sheetsRegex = /<iframe[^>]*src="https:\/\/docs\.google\.com\/spreadsheets\/[^"]*"[^>]*><\/iframe>/g;

  const placeholders: string[] = [];
  html = html.replace(sheetsRegex, (match) => {
    placeholders.push(match);
    return `__GOOGLE_SHEETS_${placeholders.length - 1}__`;
  });

  return html;
}

function restoreGoogleSheets(markdown: string, placeholders: string[]): string {
  placeholders.forEach((iframe, index) => {
    markdown = markdown.replace(`__GOOGLE_SHEETS_${index}__`, iframe);
  });
  return markdown;
}

function extractMahjongTileImages(html: string, postTitle: string, postSlug: string): MahjongTileCandidate[] {
  // 麻雀牌画像のパターン: man3-66-90-s.png, pin2-66-90-s.png など
  const tileImageRegex = /<img[^>]*src="([^"]*\/(man|pin|sou|ji|aka)\d+-66-90-s\.png)"[^>]*>/g;

  const candidates: MahjongTileCandidate[] = [];
  let match;

  while ((match = tileImageRegex.exec(html)) !== null) {
    const imageUrl = match[1];
    const tileType = match[2];

    candidates.push({
      postTitle,
      postSlug,
      imageUrl,
      tileName: path.basename(imageUrl, '.png').replace('-66-90-s', ''),
    });
  }

  return candidates;
}

function htmlToMdx(html: string): { markdown: string, youtubeEmbeds: string[], googleSheets: string[] } {
  // WordPressコメントを削除
  let cleaned = html
    .replace(/<!-- wp:.*? -->/g, '')
    .replace(/<!-- \/wp:.*? -->/g, '')
    .replace(/\r\n/g, '\n');

  // 画像URLをR2に置換
  cleaned = cleaned.replace(
    /https:\/\/modern-jan\.com\/wp-content\/uploads\//g,
    'https://r2.modern-jan.com/'
  );

  // YouTube埋め込みを保持
  const youtubeEmbeds: string[] = [];
  cleaned = cleaned.replace(/<iframe[^>]*src="https:\/\/www\.youtube\.com\/embed\/[^"]*"[^>]*><\/iframe>/g, (match) => {
    youtubeEmbeds.push(match);
    return `__YOUTUBE_EMBED_${youtubeEmbeds.length - 1}__`;
  });

  // Google Sheets埋め込みを保持
  const googleSheets: string[] = [];
  cleaned = cleaned.replace(/<iframe[^>]*src="https:\/\/docs\.google\.com\/spreadsheets\/[^"]*"[^>]*><\/iframe>/g, (match) => {
    googleSheets.push(match);
    return `__GOOGLE_SHEETS_${googleSheets.length - 1}__`;
  });

  // Markdown変換
  let markdown = turndown.turndown(cleaned);

  // YouTube埋め込みを復元
  youtubeEmbeds.forEach((iframe, index) => {
    markdown = markdown.replace(`__YOUTUBE_EMBED_${index}__`, `\n\n${iframe}\n\n`);
  });

  // Google Sheets埋め込みを復元
  googleSheets.forEach((iframe, index) => {
    markdown = markdown.replace(`__GOOGLE_SHEETS_${index}__`, `\n\n${iframe}\n\n`);
  });

  return { markdown, youtubeEmbeds, googleSheets };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateLegacySlug(dateStr: string, slug: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}/${slug}`;
}

async function convertToMDX(posts: WPPost[], outputDir: string): Promise<{ redirects: Redirect[], mahjongTiles: MahjongTileCandidate[] }> {
  await fs.mkdir(outputDir, { recursive: true });

  const redirects: Redirect[] = [];
  const allMahjongTiles: MahjongTileCandidate[] = [];

  for (const post of posts) {
    const dateFormatted = formatDate(post.date);
    const legacySlug = generateLegacySlug(post.date, post.slug);

    // 麻雀牌画像を検出
    const mahjongTiles = extractMahjongTileImages(post.content, post.title, post.slug);
    allMahjongTiles.push(...mahjongTiles);

    // ファイル名はslugのみ（日付なし）
    const filename = `${post.slug}.mdx`;

    const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
publishedAt: ${dateFormatted}
tags: [${post.tags.map(t => `"${t}"`).join(', ')}]
category: "${post.categories[0] || ''}"
legacySlug: "${legacySlug}"
draft: false
---`;

    const { markdown } = htmlToMdx(post.content);
    const mdx = `${frontmatter}\n\n${markdown}\n`;

    await fs.writeFile(path.join(outputDir, filename), mdx, 'utf-8');
    console.log(`✅ Created: ${filename}`);

    // リダイレクト情報を収集
    redirects.push({
      from: `/${legacySlug}/`,
      to: `/blog/${post.slug}/`,
    });
  }

  return { redirects, mahjongTiles: allMahjongTiles };
}

async function generateRedirectsFile(redirects: Redirect[], outputPath: string) {
  const content = [
    '# 旧WordPress URL → 新Astro URL (自動生成)',
    '',
    ...redirects.map(r => `${r.from}  ${r.to}  301`),
    '',
  ].join('\n');

  await fs.writeFile(outputPath, content, 'utf-8');
  console.log(`✅ Created: ${outputPath}`);
}

async function logMahjongTileConversionCandidates(tiles: MahjongTileCandidate[], logPath: string) {
  if (tiles.length === 0) {
    console.log('ℹ️  No mahjong tile images detected');
    return;
  }

  const logs: string[] = [
    '# 麻雀牌画像（PNG）→ mj-tiles記法への変換候補',
    '',
    '以下の麻雀牌画像が検出されました。',
    '手動で mj-tiles 記法に変換してください。',
    '',
  ];

  // 記事ごとにグループ化
  const tilesByPost = tiles.reduce((acc, tile) => {
    if (!acc[tile.postSlug]) {
      acc[tile.postSlug] = {
        title: tile.postTitle,
        tiles: [],
      };
    }
    acc[tile.postSlug].tiles.push(tile);
    return acc;
  }, {} as Record<string, { title: string, tiles: MahjongTileCandidate[] }>);

  for (const [slug, data] of Object.entries(tilesByPost)) {
    logs.push(`## ${data.title} (${slug})`);
    logs.push(`ファイル: src/content/posts/${slug}.mdx`);
    logs.push(`検出: ${data.tiles.length}件の麻雀牌画像`);
    logs.push('');

    data.tiles.forEach((tile, index) => {
      logs.push(`${index + 1}. ${tile.tileName}`);
      logs.push(`   URL: ${tile.imageUrl}`);
      logs.push(`   変換例: <MjTiles tiles="${tile.tileName}" />`);
      logs.push('');
    });

    logs.push('---');
    logs.push('');
  }

  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.writeFile(logPath, logs.join('\n'), 'utf-8');
  console.log(`✅ Mahjong tile conversion candidates logged to: ${logPath}`);
}

// メイン処理
async function main() {
  const xmlPath = process.argv[2] || '../docs/WordPress.2026-01-16.xml';
  const outputDir = './src/content/posts';
  const redirectsPath = './public/_redirects';
  const mahjongLogPath = './logs/mahjong-tile-conversion-candidates.txt';

  console.log('🚀 Starting WordPress → Astro conversion...\n');

  try {
    console.log('📄 Parsing WordPress XML...');
    const posts = await parseWordPressXML(xmlPath);
    console.log(`✅ Found ${posts.length} published posts\n`);

    console.log('🔄 Converting to MDX...');
    const { redirects, mahjongTiles } = await convertToMDX(posts, outputDir);
    console.log(`✅ Converted ${posts.length} posts to MDX\n`);

    console.log('📝 Generating 301 redirects file...');
    await generateRedirectsFile(redirects, redirectsPath);
    console.log('');

    console.log('🀄 Logging mahjong tile conversion candidates...');
    await logMahjongTileConversionCandidates(mahjongTiles, mahjongLogPath);
    console.log('');

    console.log('✨ Conversion complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the converted MDX files in src/content/posts/');
    console.log('2. Check the 301 redirects in public/_redirects');
    console.log(`3. Convert mahjong tile images manually using the log: ${mahjongLogPath}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
