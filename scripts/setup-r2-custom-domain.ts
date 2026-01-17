import { execSync } from 'child_process';

const BUCKET_NAME = 'modern-jan-images';
const CUSTOM_DOMAIN = 'r2.modern-jan.com';
const ZONE_DOMAIN = 'modern-jan.com';

async function getZoneId(zoneName: string): Promise<string | null> {
  const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!CLOUDFLARE_API_TOKEN) {
    console.error('❌ CLOUDFLARE_API_TOKEN not set');
    console.error('Please set your Cloudflare API token:');
    console.error('export CLOUDFLARE_API_TOKEN="your-api-token"');
    return null;
  }

  console.log(`🔍 Fetching zone ID for: ${zoneName}`);

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones?name=${zoneName}`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!data.success || data.result.length === 0) {
      console.error(`❌ Zone not found: ${zoneName}`);
      return null;
    }

    const zoneId = data.result[0].id;
    console.log(`✅ Found zone ID: ${zoneId}`);
    return zoneId;
  } catch (error) {
    console.error('❌ Error fetching zone ID:', error);
    return null;
  }
}

async function setupCustomDomain() {
  console.log('🚀 Setting up R2 custom domain...\n');

  // Get zone ID
  const zoneId = await getZoneId(ZONE_DOMAIN);
  if (!zoneId) {
    console.error('\n❌ Failed to get zone ID');
    console.error('You can also find your Zone ID at:');
    console.error('https://dash.cloudflare.com/ → Select your domain → Zone ID in the right sidebar');
    process.exit(1);
  }

  // Add custom domain to R2 bucket
  console.log(`\n🔗 Adding custom domain to R2 bucket...`);
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Domain: ${CUSTOM_DOMAIN}`);
  console.log(`Zone ID: ${zoneId}\n`);

  try {
    const command = `wrangler r2 bucket domain add ${BUCKET_NAME} --domain ${CUSTOM_DOMAIN} --zone-id ${zoneId} --min-tls 1.2 -y`;
    console.log(`Running: ${command}\n`);

    // Remove CLOUDFLARE_API_TOKEN from env to use wrangler's OAuth
    const env = { ...process.env };
    delete env.CLOUDFLARE_API_TOKEN;

    execSync(command, { stdio: 'inherit', env });

    console.log('\n✅ Custom domain setup complete!');
    console.log(`\nYour images are now accessible at:`);
    console.log(`https://${CUSTOM_DOMAIN}/`);
    console.log(`\nExample:`);
    console.log(`https://${CUSTOM_DOMAIN}/2022/04/FDFS54GaUAAkqTe-902x1024.avif`);
  } catch (error) {
    console.error('\n❌ Error setting up custom domain:', error);
    console.error('\nYou can also set up the custom domain manually:');
    console.error(`1. Go to https://dash.cloudflare.com/`);
    console.error(`2. Navigate to R2 → ${BUCKET_NAME}`);
    console.error(`3. Settings → Custom Domains → Connect Domain`);
    console.error(`4. Enter: ${CUSTOM_DOMAIN}`);
    process.exit(1);
  }
}

// Check if bucket exists
async function checkBucket() {
  try {
    console.log(`Checking if bucket exists: ${BUCKET_NAME}`);

    // Remove CLOUDFLARE_API_TOKEN from env to use wrangler's OAuth
    const env = { ...process.env };
    delete env.CLOUDFLARE_API_TOKEN;

    execSync(`wrangler r2 bucket info ${BUCKET_NAME}`, {
      stdio: 'pipe',
      env
    });
    console.log(`✅ Bucket exists: ${BUCKET_NAME}\n`);
    return true;
  } catch (error) {
    console.error(`❌ Bucket not found: ${BUCKET_NAME}`);
    return false;
  }
}

async function main() {
  const bucketExists = await checkBucket();
  if (!bucketExists) {
    console.error('Please create the bucket first.');
    process.exit(1);
  }

  await setupCustomDomain();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
