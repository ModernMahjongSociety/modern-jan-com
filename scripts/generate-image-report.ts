import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

// MDXファイルのディレクトリ
const postsDir = '/Users/kenta/repo/modern-jan-hp/src/content/posts';
const uploadsDir = '/Users/kenta/repo/modern-jan-hp/docs/uploads';

// WordPress画像データ（スクリプト実行結果から手動で作成）
const wordpressThumbnails: Record<string, string> = {
  '%e3%83%81%e3%83%bc%e3%80%81%e3%82%ab%e3%83%b3%e3%80%81%e3%83%9d%e3%83%b3%e3%81%ab%e3%82%83%ef%bc%81%e4%ba%8c%e6%9c%ac%e5%a0%b4%e3%81%ab%e3%82%b5%e3%83%bc%e3%82%af%e3%83%ab%e5%8f%82%e5%8a%a0%e3%81%97': '2024/09/S__140771361_0.jpg',
  '2021report': '2022/07/2021年度活動報告.jpg',
  'haikouritsu': '2021/10/解説記事アイキャッチ-牌効率-1.jpg',
  'hello-world': '2021/10/アートボード-2-100.jpg',
  'luckyj_article_ja': '2023/08/wordpress-アイキャッチ-AI翻訳.jpg',
  'luckyj_vs_naga_and_suphx': '2023/09/wordpress-アイキャッチ-AI比較.jpg',
  'middle_haikouritsu': '2023/09/解説記事アイキャッチ-中級者向け.jpg',
  'mjrs': '2022/07/MJS-Review-Supporter_carsel_1200.png',
  'movie-beginner': '2021/10/動画初心者向け.jpg',
  'newreague': '2021/10/爵王戦アイキャッチ.png',
  'shakureport1-1': '2021/10/Kansen-syaku1-1-3-1.jpg',
  'shakureport1-3': '2021/10/Kansen-syaku1-3.jpg',
  'syakuou-1-result': '2022/07/爵王位決定戦優勝.png',
  'syakureport1-8': '2021/10/Kansen-syaku1-8.jpg',
};

interface PostInfo {
  filename: string;
  slug: string;
  title: string;
  legacySlug: string;
  currentImage: string | null;
  wpSlug: string;
  expectedImage: string | null;
  imageExists: boolean;
  status: 'OK' | '欠損' | 'スラッグ不一致';
}

function extractSlugFromLegacy(legacySlug: string): string {
  // "2021/10/06/hello-world" -> "hello-world"
  const parts = legacySlug.split('/');
  return parts[parts.length - 1];
}

async function analyzeImages() {
  const mdxFiles = readdirSync(postsDir).filter(f => f.endsWith('.mdx'));
  const posts: PostInfo[] = [];

  for (const filename of mdxFiles) {
    const fullPath = join(postsDir, filename);
    const content = readFileSync(fullPath, 'utf-8');
    const { data } = matter(content);

    const legacySlug = data.legacySlug || '';
    const wpSlug = extractSlugFromLegacy(legacySlug);
    const expectedImage = wordpressThumbnails[wpSlug] || null;

    let imageExists = false;
    if (expectedImage) {
      try {
        const imagePath = join(uploadsDir, expectedImage);
        readFileSync(imagePath);
        imageExists = true;
      } catch {
        imageExists = false;
      }
    }

    const currentImage = data.image || null;

    let status: 'OK' | '欠損' | 'スラッグ不一致' = '欠損';
    if (currentImage) {
      status = 'OK';
    } else if (!expectedImage) {
      status = 'スラッグ不一致';
    } else if (expectedImage && imageExists) {
      status = '欠損';
    }

    posts.push({
      filename,
      slug: filename.replace('.mdx', ''),
      title: data.title || '',
      legacySlug,
      currentImage,
      wpSlug,
      expectedImage,
      imageExists,
      status
    });
  }

  // Sort by filename
  posts.sort((a, b) => a.filename.localeCompare(b.filename));

  console.log('# OGP/サムネイル画像 欠損レポート\n');
  console.log('## サマリー\n');

  const total = posts.length;
  const missing = posts.filter(p => p.status === '欠損').length;
  const hasImage = posts.filter(p => p.status === 'OK').length;
  const mismatch = posts.filter(p => p.status === 'スラッグ不一致').length;

  console.log(`- **全記事数**: ${total}件`);
  console.log(`- **画像設定済み**: ${hasImage}件`);
  console.log(`- **画像欠損**: ${missing}件`);
  console.log(`- **スラッグ不一致**: ${mismatch}件\n`);

  console.log('## 詳細\n');
  console.log('| MDXファイル | タイトル | 現在の画像 | WordPress画像 | 状態 |');
  console.log('|------------|---------|-----------|--------------|------|');

  for (const post of posts) {
    const currentImg = post.currentImage || '-';
    const wpImg = post.expectedImage ? `✓ ${post.expectedImage}` : '-';
    const statusIcon = post.status === 'OK' ? '✅' : post.status === '欠損' ? '❌' : '⚠️';

    console.log(`| ${post.filename} | ${post.title} | ${currentImg} | ${wpImg} | ${statusIcon} ${post.status} |`);
  }

  if (missing > 0) {
    console.log('\n## 修正が必要な記事\n');
    console.log('以下のMDXファイルのフロントマターに `image` フィールドを追加してください:\n');

    const missingPosts = posts.filter(p => p.status === '欠損');
    for (const post of missingPosts) {
      const r2Path = `https://r2.modern-jan.com/${post.expectedImage}`;
      console.log(`### ${post.filename}`);
      console.log('```yaml');
      console.log(`image: "${r2Path}"`);
      console.log('```\n');
    }
  }
}

analyzeImages().catch(console.error);
