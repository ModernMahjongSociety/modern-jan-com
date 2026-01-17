import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, extname, basename, dirname } from 'path';

// R2 Configuration
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '30cbe6a974969f022fb5deb3c755b419';
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = 'modern-jan-images';

// R2 Endpoint
const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Configuration
const SOURCE_DIR = '/Users/kenta/repo/modern-jan-hp/docs/uploads';
const REFERENCED_IMAGES_FILE = '/Users/kenta/repo/modern-jan-hp/logs/referenced-images.json';
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_CONVERSION = process.argv.includes('--skip-conversion');

// Initialize S3 Client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID!,
    secretAccessKey: SECRET_ACCESS_KEY!,
  },
});

// Get MIME type for file
function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  if (ext === '.avif') return 'image/avif';
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

// Convert image to AVIF
async function convertToAvif(filePath: string): Promise<Buffer> {
  console.log(`  Converting to AVIF: ${basename(filePath)}`);
  return await sharp(filePath)
    .toFormat('avif', { quality: 80 })
    .toBuffer();
}

// Upload to R2
async function uploadToR2(key: string, buffer: Buffer, contentType: string) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would upload: ${key} (${contentType}, ${(buffer.length / 1024).toFixed(2)} KB)`);
    return;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  console.log(`  ✅ Uploaded: ${key} (${(buffer.length / 1024).toFixed(2)} KB)`);
}

// Main function
async function main() {
  console.log('🚀 Starting image optimization and upload to R2...\n');
  console.log(`Source directory: ${SOURCE_DIR}`);
  console.log(`Target bucket: ${BUCKET_NAME}`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Dry run: ${DRY_RUN ? 'Yes' : 'No'}`);
  console.log(`Skip conversion: ${SKIP_CONVERSION ? 'Yes' : 'No'}\n`);

  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    console.error('❌ Error: R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set');
    console.error('Please create an R2 API token at: https://dash.cloudflare.com/');
    process.exit(1);
  }

  // Load referenced images list
  const referencedData = JSON.parse(readFileSync(REFERENCED_IMAGES_FILE, 'utf-8'));
  const imageFiles: string[] = referencedData.files;

  console.log(`📋 Loading referenced images from: ${REFERENCED_IMAGES_FILE}`);
  console.log(`Found ${imageFiles.length} referenced images\n`);

  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  // Process each image
  for (let i = 0; i < imageFiles.length; i++) {
    const relativePath = imageFiles[i];
    const filePath = join(SOURCE_DIR, relativePath);

    try {
      console.log(`[${i + 1}/${imageFiles.length}] Processing: ${relativePath}`);

      let buffer: Buffer;
      let key: string;
      let contentType: string;

      if (SKIP_CONVERSION) {
        // Upload original file
        buffer = readFileSync(filePath);
        key = relativePath;
        contentType = getMimeType(filePath);
      } else {
        // Convert to AVIF and upload
        buffer = await convertToAvif(filePath);
        // Replace extension with .avif
        const fileBasename = basename(filePath, extname(filePath));
        const dir = dirname(relativePath);
        key = join(dir, `${fileBasename}.avif`);
        contentType = 'image/avif';
      }

      await uploadToR2(key, buffer, contentType);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Error processing ${relativePath}:`, error);
      errorCount++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ Complete!`);
  console.log(`Total: ${imageFiles.length} files`);
  console.log(`Success: ${successCount} files`);
  console.log(`Errors: ${errorCount} files`);
  console.log(`Time: ${elapsed} seconds`);

  if (!SKIP_CONVERSION) {
    console.log(`\n📝 Note: Images were converted to AVIF format`);
    console.log(`You'll need to update image URLs in your MDX files to use .avif extension`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
