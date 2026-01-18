import { readFileSync } from 'fs';
import { parseStringPromise } from 'xml2js';

interface Post {
  title: string;
  slug: string;
  thumbnailId: string | null;
  postId: string;
}

interface Attachment {
  id: string;
  url: string;
  filename: string;
}

async function extractThumbnails() {
  const xmlPath = '/Users/kenta/repo/modern-jan-hp/docs/WordPress.2026-01-16.xml';
  const xmlContent = readFileSync(xmlPath, 'utf-8');

  const result = await parseStringPromise(xmlContent);
  const items = result.rss.channel[0].item;

  const posts: Post[] = [];
  const attachments: Attachment[] = [];

  for (const item of items) {
    const postType = item['wp:post_type']?.[0];
    const status = item['wp:status']?.[0];

    // Published posts only
    if (postType === 'post' && status === 'publish') {
      const postId = item['wp:post_id']?.[0];
      const title = item['title']?.[0];
      const slug = item['wp:post_name']?.[0];
      const postmeta = item['wp:postmeta'] || [];

      let thumbnailId: string | null = null;

      for (const meta of postmeta) {
        const metaKey = meta['wp:meta_key']?.[0];
        if (metaKey === '_thumbnail_id') {
          thumbnailId = meta['wp:meta_value']?.[0];
          break;
        }
      }

      posts.push({ title, slug, thumbnailId, postId });
    }

    // Extract attachments (images)
    if (postType === 'attachment') {
      const attachmentId = item['wp:post_id']?.[0];
      const url = item['wp:attachment_url']?.[0];
      const filename = url?.split('/').pop() || '';

      attachments.push({ id: attachmentId, url, filename });
    }
  }

  console.log('=== 記事とサムネイル画像の対応 ===\n');

  const results: any[] = [];

  for (const post of posts) {
    const attachment = post.thumbnailId
      ? attachments.find(a => a.id === post.thumbnailId)
      : null;

    results.push({
      slug: post.slug,
      title: post.title,
      thumbnailId: post.thumbnailId || 'なし',
      imageUrl: attachment?.url || 'なし',
      imageFilename: attachment?.filename || 'なし'
    });
  }

  // Sort by slug
  results.sort((a, b) => a.slug.localeCompare(b.slug));

  // Output as table
  console.log('| スラッグ | タイトル | サムネイルID | 画像URL |');
  console.log('|---------|---------|-------------|---------|');

  for (const r of results) {
    console.log(`| ${r.slug} | ${r.title} | ${r.thumbnailId} | ${r.imageUrl} |`);
  }

  console.log('\n=== 欠損状況 ===');
  const missing = results.filter(r => r.thumbnailId === 'なし');
  const hasImage = results.filter(r => r.thumbnailId !== 'なし');

  console.log(`サムネイル画像あり: ${hasImage.length}件`);
  console.log(`サムネイル画像なし: ${missing.length}件`);

  if (missing.length > 0) {
    console.log('\n欠損記事:');
    for (const m of missing) {
      console.log(`  - ${m.slug}: ${m.title}`);
    }
  }
}

extractThumbnails().catch(console.error);
