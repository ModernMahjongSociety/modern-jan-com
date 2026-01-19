import * as fs from 'fs/promises';
import * as path from 'path';

interface ConversionResult {
  file: string;
  conversions: number;
  addedImport: boolean;
}

/**
 * 単独行のmodern-jan.com URLをLinkCardコンポーネントに変換
 */
async function convertUrlsToLinkCards(dryRun: boolean = false): Promise<ConversionResult[]> {
  const postsDir = 'src/content/posts';
  const allFiles = await fs.readdir(postsDir);
  const files = allFiles
    .filter(file => file.endsWith('.mdx'))
    .map(file => path.join(postsDir, file));

  const results: ConversionResult[] = [];

  console.log(`🔍 ${files.length}個のMDXファイルを検索中...\n`);

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');

    // 単独行のURL（前後に空行がある）を検出
    // バックスラッシュエスケープも考慮（middle\_haikouritsu → middle_haikouritsu）
    // [a-z0-9_\\-]+ で _ またはエスケープされた \_ にマッチ
    const urlPattern = /^(https:\/\/modern-jan\.com\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9_\\-]+\/?)\s*$/gm;

    const urls = [...content.matchAll(urlPattern)];

    if (urls.length === 0) {
      continue;
    }

    let newContent = content;
    let conversions = 0;

    // URLをLinkCardに置換
    for (const match of urls) {
      const originalUrl = match[0].trim();
      // バックスラッシュエスケープを削除
      const cleanUrl = originalUrl.replace(/\\/g, '');
      // 末尾のスラッシュを統一
      const normalizedUrl = cleanUrl.replace(/\/$/, '') + '/';

      const replacement = `<LinkCard url="${normalizedUrl}" />`;

      // 元のURLを置換（前後の空行を保持）
      newContent = newContent.replace(
        new RegExp(`^${escapeRegExp(originalUrl)}\\s*$`, 'gm'),
        replacement
      );
      conversions++;
    }

    // import文を追加（まだ存在しない場合）
    const importStatement = "import LinkCard from '../../components/LinkCard.astro';";
    const hasImport = newContent.includes(importStatement);
    let addedImport = false;

    if (!hasImport && conversions > 0) {
      // frontmatterの後に追加（--- で終わる行の後）
      const frontmatterEnd = newContent.indexOf('---', 3); // 2つ目の---を探す

      if (frontmatterEnd !== -1) {
        const insertPosition = frontmatterEnd + 3; // --- の後
        newContent =
          newContent.slice(0, insertPosition) +
          '\n\n' + importStatement + '\n' +
          newContent.slice(insertPosition);
        addedImport = true;
      }
    }

    if (conversions > 0) {
      if (!dryRun) {
        await fs.writeFile(file, newContent, 'utf-8');
        console.log(`✅ ${path.basename(file)}: ${conversions}個のURLを変換 ${addedImport ? '+ import追加' : ''}`);
      } else {
        console.log(`🔍 ${path.basename(file)}: ${conversions}個のURLが変換対象 ${addedImport ? '(import追加必要)' : ''}`);
      }

      results.push({
        file: path.basename(file),
        conversions,
        addedImport,
      });
    }
  }

  return results;
}

/**
 * 正規表現用のエスケープ関数
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * メイン処理
 */
async function main() {
  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

  console.log('🚀 リンクカード変換スクリプト\n');

  if (isDryRun) {
    console.log('⚠️  ドライランモード: ファイルは変更されません\n');
  } else {
    console.log('💡 ヒント: --dry-run オプションで事前確認できます\n');
  }

  try {
    const results = await convertUrlsToLinkCards(isDryRun);

    if (results.length === 0) {
      console.log('\n📝 変換対象のURLが見つかりませんでした');
      return;
    }

    console.log('\n📊 変換サマリー');
    console.log('─'.repeat(50));

    const totalConversions = results.reduce((sum, r) => sum + r.conversions, 0);
    const filesWithImport = results.filter(r => r.addedImport).length;

    console.log(`変換ファイル数: ${results.length}`);
    console.log(`総変換URL数: ${totalConversions}`);
    console.log(`import追加: ${filesWithImport}ファイル`);
    console.log('─'.repeat(50));

    if (isDryRun) {
      console.log('\n✅ ドライラン完了！問題なければ --dry-run を外して実行してください');
    } else {
      console.log('\n✅ 変換完了！');
      console.log('\n次のステップ:');
      console.log('1. bun run dev でローカル確認');
      console.log('2. git diff で変更内容を確認');
      console.log('3. 問題なければコミット');
    }
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();
