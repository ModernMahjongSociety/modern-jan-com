import { readFileSync } from 'fs';
import { parseStringPromise } from 'xml2js';

interface Post {
  title: string;
  slug: string;
  thumbnailId?: string;
}

interface Attachment {
  id: string;
  url: string;
}

async function main() {
  const xmlContent = readFileSync('docs/WordPress.2026-01-16.xml', 'utf-8');
  const result = await parseStringPromise(xmlContent);

  const items = result.rss.channel[0].item || [];

  const posts: Post[] = [];
  const attachments: Record<string, string> = {};

  // 添付ファイル情報を収集
  for (const item of items) {
    const postType = item['wp:post_type']?.[0];

    if (postType === 'attachment') {
      const postId = item['wp:post_id']?.[0];
      const attachmentUrl = item['wp:attachment_url']?.[0];
      if (postId && attachmentUrl) {
        attachments[postId] = attachmentUrl;
      }
    }
  }

  // 投稿とアイキャッチ画像の対応を収集
  for (const item of items) {
    const postType = item['wp:post_type']?.[0];

    if (postType === 'post') {
      const title = item.title?.[0];
      const slug = item['wp:post_name']?.[0];

      // postmetaからサムネイルIDを取得
      let thumbnailId: string | undefined;
      const postmeta = item['wp:postmeta'] || [];
      for (const meta of postmeta) {
        const metaKey = meta['wp:meta_key']?.[0];
        const metaValue = meta['wp:meta_value']?.[0];
        if (metaKey === '_thumbnail_id') {
          thumbnailId = metaValue;
          break;
        }
      }

      if (slug && title) {
        posts.push({ title, slug, thumbnailId });
      }
    }
  }

  // 結果を出力
  console.log('\n📋 記事とアイキャッチ画像の対応:\n');
  console.log('const THUMBNAIL_MAPPING: Record<string, string> = {');

  for (const post of posts) {
    if (post.thumbnailId && attachments[post.thumbnailId]) {
      const url = attachments[post.thumbnailId];
      // URLから相対パスを抽出
      const relativePath = url.replace('https://modern-jan.com/', '').replace('http://modern-jan.com/', '');
      console.log(`  '${relativePath}': '${post.slug}',  // ${post.title}`);
    } else {
      console.log(`  // ⚠️ サムネイルなし: ${post.slug} - ${post.title}`);
    }
  }

  console.log('};');

  // 統計情報
  const postsWithThumbnails = posts.filter(p => p.thumbnailId && attachments[p.thumbnailId]).length;
  console.log(`\n📊 統計: ${posts.length}記事中 ${postsWithThumbnails}記事にサムネイル設定あり`);
}

main().catch(console.error);
