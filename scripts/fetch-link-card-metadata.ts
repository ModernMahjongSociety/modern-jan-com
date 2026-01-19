import * as fs from 'fs/promises';
import * as path from 'path';
import metascraper from 'metascraper';
import metascraperTitle from 'metascraper-title';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperUrl from 'metascraper-url';

interface LinkCardMetadata {
  title: string;
  description?: string;
  image?: string;
  fetchedAt: string;
}

interface LinkCardCache {
  [url: string]: LinkCardMetadata;
}

const CACHE_FILE = 'src/data/link-cards.json';
const CACHE_MAX_AGE_DAYS = 30;

/**
 * metascraperインスタンスを作成
 */
const scraper = metascraper([
  metascraperTitle(),
  metascraperDescription(),
  metascraperImage(),
  metascraperUrl(),
]);

/**
 * URLからOGP情報を取得
 */
async function fetchMetadata(url: string): Promise<LinkCardMetadata> {
  try {
    console.log(`  📡 取得中: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ModernJanBot/1.0)',
      },
      signal: AbortSignal.timeout(10000), // 10秒タイムアウト
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const metadata = await scraper({ html, url });

    return {
      title: metadata.title || url,
      description: metadata.description,
      image: metadata.image,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`  ❌ エラー: ${url}`, error instanceof Error ? error.message : error);

    // フォールバック: URLをタイトルとして使用
    return {
      title: url,
      description: undefined,
      image: undefined,
      fetchedAt: new Date().toISOString(),
    };
  }
}

/**
 * キャッシュファイルを読み込み
 */
async function loadCache(): Promise<LinkCardCache> {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は空のオブジェクトを返す
    return {};
  }
}

/**
 * キャッシュファイルに保存
 */
async function saveCache(cache: LinkCardCache): Promise<void> {
  // ディレクトリが存在しない場合は作成
  const dir = path.dirname(CACHE_FILE);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(
    CACHE_FILE,
    JSON.stringify(cache, null, 2),
    'utf-8'
  );
}

/**
 * キャッシュが有効かどうかをチェック
 */
function isCacheValid(metadata: LinkCardMetadata): boolean {
  const fetchedAt = new Date(metadata.fetchedAt);
  const now = new Date();
  const ageInDays = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays < CACHE_MAX_AGE_DAYS;
}

/**
 * MDXファイルから外部URLを抽出
 */
async function extractExternalUrls(): Promise<Set<string>> {
  const postsDir = 'src/content/posts';
  const allFiles = await fs.readdir(postsDir);
  const files = allFiles
    .filter(file => file.endsWith('.mdx'))
    .map(file => path.join(postsDir, file));

  const urls = new Set<string>();

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');

    // <LinkCard url="..." /> を検出
    const linkCardPattern = /<LinkCard\s+url="([^"]+)"\s*\/>/g;
    const matches = [...content.matchAll(linkCardPattern)];

    for (const match of matches) {
      const url = match[1];
      // 外部リンクのみ（modern-jan.com以外）
      if (!url.includes('modern-jan.com') && url.startsWith('http')) {
        urls.add(url);
      }
    }
  }

  return urls;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🔍 リンクカードメタデータ取得スクリプト\n');

  try {
    // 1. MDXファイルから外部URLを抽出
    console.log('📝 記事ファイルから外部URLを抽出中...');
    const externalUrls = await extractExternalUrls();

    if (externalUrls.size === 0) {
      console.log('✅ 外部URLが見つかりませんでした');
      return;
    }

    console.log(`   見つかった外部URL: ${externalUrls.size}個\n`);

    // 2. キャッシュを読み込み
    console.log('💾 キャッシュを読み込み中...');
    const cache = await loadCache();
    console.log(`   既存キャッシュ: ${Object.keys(cache).length}個\n`);

    // 3. 各URLのメタデータを取得（キャッシュがない or 古い場合のみ）
    console.log('📡 メタデータを取得中...\n');

    let fetchCount = 0;
    let cacheHitCount = 0;

    for (const url of externalUrls) {
      const cached = cache[url];

      if (cached && isCacheValid(cached)) {
        console.log(`  ✅ キャッシュ使用: ${url}`);
        cacheHitCount++;
        continue;
      }

      // 新規取得またはキャッシュ更新
      const metadata = await fetchMetadata(url);
      cache[url] = metadata;
      fetchCount++;

      // レート制限のため1秒待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 4. キャッシュを保存
    console.log('\n💾 キャッシュを保存中...');
    await saveCache(cache);

    // 5. サマリー表示
    console.log('\n📊 取得サマリー');
    console.log('─'.repeat(50));
    console.log(`外部URL数: ${externalUrls.size}`);
    console.log(`新規取得: ${fetchCount}`);
    console.log(`キャッシュ使用: ${cacheHitCount}`);
    console.log(`キャッシュファイル: ${CACHE_FILE}`);
    console.log('─'.repeat(50));
    console.log('\n✅ メタデータ取得完了！');

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();
