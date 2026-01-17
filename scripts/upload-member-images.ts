import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

// R2 Configuration
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '30cbe6a974969f022fb5deb3c755b419';
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = 'modern-jan-images';
const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

const MEMBERS_DIR = '/Users/kenta/repo/modern-jan-hp/public/images/members';
const MEMBER_IMAGES = [
  'kobaken.png',
  'takano.png',
  'koyayakko.png',
  'tamaba.jpg'
];

// Initialize S3 Client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID!,
    secretAccessKey: SECRET_ACCESS_KEY!,
  },
});

async function convertToAvif(filePath: string): Promise<Buffer> {
  console.log(`  Converting to AVIF...`);
  return await sharp(filePath)
    .toFormat('avif', { quality: 80 })
    .toBuffer();
}

async function uploadToR2(key: string, buffer: Buffer) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: 'image/avif',
  });

  await s3Client.send(command);
  console.log(`  ✅ Uploaded: ${key} (${(buffer.length / 1024).toFixed(2)} KB)`);
}

async function main() {
  console.log('🚀 Uploading member images to R2...\n');

  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    console.error('❌ Error: R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set');
    process.exit(1);
  }

  for (const filename of MEMBER_IMAGES) {
    try {
      console.log(`Processing: ${filename}`);
      const filePath = join(MEMBERS_DIR, filename);
      const buffer = await convertToAvif(filePath);
      const key = `members/${filename.replace(/\.(png|jpg)$/, '.avif')}`;
      await uploadToR2(key, buffer);
    } catch (error) {
      console.error(`  ❌ Error processing ${filename}:`, error);
    }
  }

  console.log('\n✨ Complete!');
}

main().catch(console.error);
