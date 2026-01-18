import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const postsDir = '/Users/kenta/repo/modern-jan-hp/src/content/posts';

// 牌画像URLを mj-tiles のTile記法に変換
function convertTileImageToNotation(imageUrl: string): string | null {
  // man1-66-90-s.avif → 1m
  const manMatch = imageUrl.match(/man(\d)-66-90-s\.avif/);
  if (manMatch) return `${manMatch[1]}m`;

  // pin1-66-90-s.avif → 1p
  const pinMatch = imageUrl.match(/pin(\d)-66-90-s\.avif/);
  if (pinMatch) return `${pinMatch[1]}p`;

  // sou1-66-90-s.avif → 1s
  const souMatch = imageUrl.match(/sou(\d)-66-90-s\.avif/);
  if (souMatch) return `${souMatch[1]}s`;

  // ji1-66-90-s.avif → 東, ji2 → 南, etc.
  const jiMatch = imageUrl.match(/ji(\d)-66-90-s\.avif/);
  if (jiMatch) {
    const jiMap: Record<string, string> = {
      '1': '東',
      '2': '南',
      '3': '西',
      '4': '北',
      '5': '白',
      '6': '發',
      '7': '中',
    };
    return jiMap[jiMatch[1]] || null;
  }

  // aka1-66-90-s.avif → 0m (赤5萬)
  const akaMatch = imageUrl.match(/aka(\d)-66-90-s\.avif/);
  if (akaMatch) {
    const akaMap: Record<string, string> = {
      '1': '0m', // 赤5萬
      '2': '0p', // 赤5筒
      '3': '0s', // 赤5索
    };
    return akaMap[akaMatch[1]] || null;
  }

  return null;
}

// MDXファイル内の牌画像を mj-tiles に置き換え
function replaceTilesInMdx(content: string): { content: string; replaced: number; needsImport: boolean } {
  let replaced = 0;
  let needsImport = false;

  // ![](https://r2.modern-jan.com/.../man1-66-90-s.avif) のパターンを検索
  const tilePattern = /!\[\]\(https:\/\/r2\.modern-jan\.com\/[^)]*\/(man\d|pin\d|sou\d|ji\d|aka\d)-66-90-s\.avif\)/g;

  const newContent = content.replace(tilePattern, (match) => {
    // URLを抽出
    const urlMatch = match.match(/https:\/\/r2\.modern-jan\.com\/[^)]+/);
    if (!urlMatch) return match;

    const imageUrl = urlMatch[0];
    const notation = convertTileImageToNotation(imageUrl);

    if (notation) {
      replaced++;
      needsImport = true;
      return `<Tile tile="${notation}" />`;
    }

    return match;
  });

  return { content: newContent, replaced, needsImport };
}

// frontmatter直後にimport文を追加
function addImportStatement(content: string): string {
  // frontmatter (---\n...\n---) を検索
  const frontmatterMatch = content.match(/^(---\n[\s\S]*?\n---\n)/);

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const restContent = content.slice(frontmatter.length);

    // 既にimportがある場合はスキップ
    if (restContent.includes("import Tile from 'mj-tiles/astro/Tile.astro'")) {
      return content;
    }

    return `${frontmatter}\nimport Tile from 'mj-tiles/astro/Tile.astro'\nimport 'mj-tiles/styles.css'\n${restContent}`;
  }

  return content;
}

// メイン処理
function main() {
  const mdxFiles = readdirSync(postsDir).filter(f => f.endsWith('.mdx'));

  let totalReplaced = 0;
  let filesModified = 0;

  console.log('🎴 麻雀牌画像を mj-tiles に置き換えています...\n');

  for (const filename of mdxFiles) {
    const fullPath = join(postsDir, filename);
    const content = readFileSync(fullPath, 'utf-8');

    const { content: newContent, replaced, needsImport } = replaceTilesInMdx(content);

    if (replaced > 0) {
      let finalContent = newContent;

      if (needsImport) {
        finalContent = addImportStatement(newContent);
      }

      writeFileSync(fullPath, finalContent, 'utf-8');

      console.log(`✅ ${filename}: ${replaced}個の牌を置き換えました`);
      totalReplaced += replaced;
      filesModified++;
    }
  }

  console.log(`\n🎉 完了！`);
  console.log(`📊 ${filesModified}個のファイルで${totalReplaced}個の牌を置き換えました`);
}

main();
