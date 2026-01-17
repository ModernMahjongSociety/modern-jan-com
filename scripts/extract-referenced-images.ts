import { readdirSync, readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const POSTS_DIR = '/Users/kenta/repo/modern-jan-hp/src/content/posts';
const UPLOADS_DIR = '/Users/kenta/repo/modern-jan-hp/docs/uploads';
const OUTPUT_FILE = '/Users/kenta/repo/modern-jan-hp/logs/referenced-images.json';

// Extract image URLs from MDX content
function extractImageUrls(content: string): string[] {
  const urls: string[] = [];

  // Pattern 1: ![alt](https://r2.modern-jan.com/...)
  const markdownPattern = /!\[.*?\]\((https:\/\/r2\.modern-jan\.com\/[^)]+)\)/g;
  let match;

  while ((match = markdownPattern.exec(content)) !== null) {
    urls.push(match[1]);
  }

  // Pattern 2: <img src="https://r2.modern-jan.com/..." />
  const htmlPattern = /<img[^>]+src=["'](https:\/\/r2\.modern-jan\.com\/[^"']+)["']/g;

  while ((match = htmlPattern.exec(content)) !== null) {
    urls.push(match[1]);
  }

  return urls;
}

// Convert R2 URL to local file path
function urlToLocalPath(url: string): string | null {
  // Extract path after domain: https://r2.modern-jan.com/2024/09/image.jpg -> 2024/09/image.jpg
  const match = url.match(/https:\/\/r2\.modern-jan\.com\/(.+)/);
  if (!match) return null;

  const relativePath = match[1];
  return join(UPLOADS_DIR, relativePath);
}

function main() {
  console.log('🔍 Extracting referenced images from MDX files...\n');

  const allUrls = new Set<string>();
  const mdxFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));

  console.log(`Found ${mdxFiles.length} MDX files\n`);

  // Extract URLs from all MDX files
  for (const file of mdxFiles) {
    const filePath = join(POSTS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    const urls = extractImageUrls(content);

    if (urls.length > 0) {
      console.log(`${file}: ${urls.length} images`);
      urls.forEach(url => allUrls.add(url));
    }
  }

  console.log(`\nTotal unique image URLs: ${allUrls.size}\n`);

  // Convert URLs to local paths and check existence
  const referencedImages: Array<{ url: string; localPath: string; exists: boolean }> = [];
  const existingFiles: string[] = [];
  const missingFiles: string[] = [];

  for (const url of allUrls) {
    const localPath = urlToLocalPath(url);
    if (!localPath) {
      console.warn(`⚠️  Could not parse URL: ${url}`);
      continue;
    }

    const exists = existsSync(localPath);
    referencedImages.push({ url, localPath, exists });

    if (exists) {
      // Store relative path from uploads directory
      const relativePath = localPath.replace(UPLOADS_DIR + '/', '');
      existingFiles.push(relativePath);
    } else {
      missingFiles.push(url);
    }
  }

  // Save results
  const result = {
    totalUrls: allUrls.size,
    existingFiles: existingFiles.length,
    missingFiles: missingFiles.length,
    files: existingFiles.sort(),
    missing: missingFiles.sort(),
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));

  // Print summary
  console.log('📊 Summary:');
  console.log(`Total referenced images: ${allUrls.size}`);
  console.log(`✅ Found locally: ${existingFiles.length}`);
  console.log(`❌ Missing locally: ${missingFiles.length}`);
  console.log(`\nResults saved to: ${OUTPUT_FILE}\n`);

  if (missingFiles.length > 0) {
    console.log('⚠️  Missing files:');
    missingFiles.slice(0, 10).forEach(url => console.log(`  - ${url}`));
    if (missingFiles.length > 10) {
      console.log(`  ... and ${missingFiles.length - 10} more`);
    }
  }
}

main();
