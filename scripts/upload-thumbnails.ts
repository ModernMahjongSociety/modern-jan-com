import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// R2 Configuration
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '30cbe6a974969f022fb5deb3c755b419';
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = 'modern-jan-images';
const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

const DRY_RUN = process.argv.includes('--dry-run');

// Initialize S3 Client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID!,
    secretAccessKey: SECRET_ACCESS_KEY!,
  },
});

// アイキャッチ画像と記事のマッピング
const THUMBNAIL_MAPPING: Record<string, string> = {
  'docs/uploads/2021/10/動画初心者向け.jpg': 'movie-beginner',
  'docs/uploads/2021/10/解説記事アイキャッチ-牌効率-1.jpg': 'haikouritsu',
  'docs/uploads/2023/09/解説記事アイキャッチ-中級者向け.jpg': 'middle_haikouritsu',
  'docs/uploads/2022/07/2021年度活動報告.jpg': '2021report',
  'docs/uploads/2022/07/MJS-Review-Supporter_carsel_1200.png': 'mjrs',
  'docs/uploads/2023/08/wordpress-アイキャッチ-AI翻訳.jpg': 'luckyj_article_ja',
  'docs/uploads/2021/10/アートボード-2-100.jpg': 'hello-world',
  'docs/uploads/2021/10/爵王戦アイキャッチ.png': 'newreague',
  'docs/uploads/2021/10/Kansen-syaku1-1-3-1.jpg': 'shakureport1-1',
  'docs/uploads/2021/10/Kansen-syaku1-3.jpg': 'shakureport1-3',
  'docs/uploads/2021/10/Kansen-syaku1-8.jpg': 'syakureport1-8',
  'docs/uploads/2022/07/爵王位決定戦優勝.png': 'syakuou-1-result',
  'docs/uploads/2023/09/wordpress-アイキャッチ-AI比較.jpg': 'luckyj_vs_naga_and_suphx',
  'docs/uploads/2024/09/S__140771361_0.jpg': 'circle-participation-chi-kan-pon-nya',
};

// Convert image to AVIF
async function convertToAvif(filePath: string): Promise<Buffer> {
  console.log(`  Converting to AVIF: ${filePath}`);
  return await sharp(filePath)
    .resize(640, 337, { fit: 'cover' })  // 1.9:1比率（1200x630と同じ）で最適化
    .toFormat('avif', { quality: 75 })
    .toBuffer();
}

// Upload to R2
async function uploadToR2(key: string, buffer: Buffer) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would upload: ${key} (${(buffer.length / 1024).toFixed(2)} KB)`);
    return;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: 'image/avif',
  });

  await s3Client.send(command);
  console.log(`  ✅ Uploaded: ${key} (${(buffer.length / 1024).toFixed(2)} KB)`);
}

// Update frontmatter
function updateFrontmatter(postSlug: string, imageUrl: string) {
  const mdxPath = join(process.cwd(), 'src/content/posts', `${postSlug}.mdx`);

  try {
    let content = readFileSync(mdxPath, 'utf-8');

    // frontmatterを抽出
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      console.log(`  ⚠️  Frontmatter not found in ${postSlug}.mdx`);
      return;
    }

    const frontmatter = frontmatterMatch[1];

    // imageフィールドが既に存在するかチェック
    if (frontmatter.includes('image:')) {
      console.log(`  ℹ️  Image field already exists in ${postSlug}.mdx`);
      return;
    }

    // frontmatterにimageフィールドを追加
    const updatedFrontmatter = `---\n${frontmatter}\nimage: "${imageUrl}"\n---`;
    const updatedContent = content.replace(/^---\n[\s\S]*?\n---/, updatedFrontmatter);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would update frontmatter in ${postSlug}.mdx`);
      return;
    }

    writeFileSync(mdxPath, updatedContent, 'utf-8');
    console.log(`  ✅ Updated frontmatter in ${postSlug}.mdx`);
  } catch (error) {
    console.error(`  ❌ Error updating ${postSlug}.mdx:`, error);
  }
}

// Main function
async function main() {
  console.log('🖼️  Starting thumbnail upload to R2...\n');
  console.log(`Target bucket: ${BUCKET_NAME}`);
  console.log(`Dry run: ${DRY_RUN ? 'Yes' : 'No'}\n`);

  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    console.error('❌ Error: R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set');
    console.error('Please run with: dotenvx run -- bun run upload:thumbnails');
    process.exit(1);
  }

  for (const [filePath, postSlug] of Object.entries(THUMBNAIL_MAPPING)) {
    console.log(`\n📸 Processing: ${filePath} → ${postSlug}`);

    try {
      // Convert to AVIF
      const avifBuffer = await convertToAvif(filePath);

      // Upload to R2
      const r2Key = `thumbnails/${postSlug}.avif`;
      await uploadToR2(r2Key, avifBuffer);

      // Update frontmatter
      const imageUrl = `https://r2.modern-jan.com/${r2Key}`;
      updateFrontmatter(postSlug, imageUrl);

    } catch (error) {
      console.error(`  ❌ Error processing ${filePath}:`, error);
    }
  }

  console.log('\n🎉 Thumbnail upload complete!');
}

main().catch(console.error);
