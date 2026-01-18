import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const UPLOADS_DIR = '/Users/kenta/repo/modern-jan-hp/docs/uploads';
const REFERENCED_FILE = '/Users/kenta/repo/modern-jan-hp/logs/referenced-images.json';

// Convert R2 URL to local file path (without extension)
function urlToBasePath(url: string): string | null {
  // Extract path after domain: https://r2.modern-jan.com/2024/09/image.avif -> 2024/09/image
  const match = url.match(/https:\/\/r2\.modern-jan\.com\/(.+)/);
  if (!match) return null;

  const relativePath = match[1];
  // Remove .avif extension
  const basePath = relativePath.replace(/\.avif$/, '');
  return basePath;
}

// Find actual source file with different extensions
function findSourceFile(basePath: string): string | null {
  const possibleExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  for (const ext of possibleExtensions) {
    const fullPath = join(UPLOADS_DIR, basePath + ext);
    if (existsSync(fullPath)) {
      // Return relative path from uploads directory
      return basePath + ext;
    }
  }

  return null;
}

function main() {
  console.log('🔧 Fixing referenced-images.json with source file mapping...\n');

  // Load current data
  const data = JSON.parse(readFileSync(REFERENCED_FILE, 'utf-8'));
  const missingUrls: string[] = data.missing || [];

  console.log(`Found ${missingUrls.length} URLs with .avif extension\n`);

  const foundFiles: string[] = [];
  const stillMissing: string[] = [];

  // For each .avif URL, find the corresponding source file
  for (const url of missingUrls) {
    const basePath = urlToBasePath(url);
    if (!basePath) {
      console.warn(`⚠️  Could not parse URL: ${url}`);
      stillMissing.push(url);
      continue;
    }

    const sourceFile = findSourceFile(basePath);
    if (sourceFile) {
      foundFiles.push(sourceFile);
    } else {
      console.warn(`⚠️  No source file found for: ${basePath}`);
      stillMissing.push(url);
    }
  }

  // Update the data
  const updatedData = {
    totalUrls: data.totalUrls,
    existingFiles: foundFiles.length,
    missingFiles: stillMissing.length,
    files: foundFiles.sort(),
    missing: stillMissing.sort(),
  };

  // Save back
  writeFileSync(REFERENCED_FILE, JSON.stringify(updatedData, null, 2));

  // Print summary
  console.log('\n📊 Summary:');
  console.log(`✅ Found source files: ${foundFiles.length}`);
  console.log(`❌ Still missing: ${stillMissing.length}`);
  console.log(`\nUpdated: ${REFERENCED_FILE}\n`);

  if (stillMissing.length > 0) {
    console.log('⚠️  URLs still missing source files:');
    stillMissing.slice(0, 10).forEach(url => console.log(`  - ${url}`));
    if (stillMissing.length > 10) {
      console.log(`  ... and ${stillMissing.length - 10} more`);
    }
  }
}

main();
