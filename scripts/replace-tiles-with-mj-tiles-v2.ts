import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const postsDir = '/Users/kenta/repo/modern-jan-hp/src/content/posts';

// 牌画像URLを mj-tiles の記法に変換
function convertTileImageToNotation(imageUrl: string): string | null {
  const manMatch = imageUrl.match(/man(\d)-66-90-s\.avif/);
  if (manMatch) return `${manMatch[1]}m`;

  const pinMatch = imageUrl.match(/pin(\d)-66-90-s\.avif/);
  if (pinMatch) return `${pinMatch[1]}p`;

  const souMatch = imageUrl.match(/sou(\d)-66-90-s\.avif/);
  if (souMatch) return `${souMatch[1]}s`;

  const jiMatch = imageUrl.match(/ji(\d)-66-90-s\.avif/);
  if (jiMatch) {
    const jiMap: Record<string, string> = {
      '1': '東', '2': '南', '3': '西', '4': '北',
      '5': '白', '6': '發', '7': '中',
    };
    return jiMap[jiMatch[1]] || null;
  }

  const akaMatch = imageUrl.match(/aka(\d)-66-90-s\.avif/);
  if (akaMatch) {
    const akaMap: Record<string, string> = {
      '1': '0m', '2': '0p', '3': '0s',
    };
    return akaMap[akaMatch[1]] || null;
  }

  return null;
}

// 牌の記法から種類を判定（数牌か字牌か）
function getTileType(notation: string): 'm' | 'p' | 's' | 'z' | null {
  if (notation.endsWith('m')) return 'm';
  if (notation.endsWith('p')) return 'p';
  if (notation.endsWith('s')) return 's';
  if (['東', '南', '西', '北', '白', '發', '中'].includes(notation)) return 'z';
  return null;
}

// 連続する同種の牌をグループ化
function groupConsecutiveTiles(tiles: string[]): string[] {
  if (tiles.length === 0) return [];
  if (tiles.length === 1) return tiles;

  const groups: string[] = [];
  let currentGroup: string[] = [tiles[0]];
  let currentType = getTileType(tiles[0]);

  for (let i = 1; i < tiles.length; i++) {
    const tile = tiles[i];
    const tileType = getTileType(tile);

    // 同じ種類（萬子、筒子、索子）なら同じグループに
    if (tileType && tileType === currentType && tileType !== 'z') {
      currentGroup.push(tile);
    } else {
      // グループを確定
      if (currentGroup.length > 1) {
        // 複数牌を統合
        const numbers = currentGroup.map(t => t.replace(/[mps]/, '')).join('');
        groups.push(`${numbers}${currentType}`);
      } else {
        groups.push(currentGroup[0]);
      }
      // 新しいグループ開始
      currentGroup = [tile];
      currentType = tileType;
    }
  }

  // 最後のグループを追加
  if (currentGroup.length > 1) {
    const numbers = currentGroup.map(t => t.replace(/[mps]/, '')).join('');
    groups.push(`${numbers}${currentType}`);
  } else {
    groups.push(currentGroup[0]);
  }

  return groups;
}

// MDXファイル内の牌画像を mj-tiles に置き換え
function replaceTilesInMdx(content: string): { content: string; replaced: number; needsImport: boolean } {
  let replaced = 0;
  let needsImport = false;

  // まず画像を一時的なマーカーに変換
  const tilePattern = /!\[\]\(https:\/\/r2\.modern-jan\.com\/[^)]*\/(man\d|pin\d|sou\d|ji\d|aka\d)-66-90-s\.avif\)/g;

  let tempContent = content.replace(tilePattern, (match) => {
    const urlMatch = match.match(/https:\/\/r2\.modern-jan\.com\/[^)]+/);
    if (!urlMatch) return match;

    const imageUrl = urlMatch[0];
    const notation = convertTileImageToNotation(imageUrl);

    if (notation) {
      replaced++;
      needsImport = true;
      return `__TILE__${notation}__TILE__`;
    }

    return match;
  });

  // 連続するタイルマーカーを検出して統合
  // パターン: __TILE__3s__TILE____TILE__6s__TILE__
  // または: __TILE__7p__TILE__,__TILE__8p__TILE__ (カンマ付き)
  const consecutivePattern = /__TILE__([^_]+)__TILE__(?:,?\s*__TILE__([^_]+)__TILE__)+/g;

  tempContent = tempContent.replace(consecutivePattern, (match) => {
    // マーカー内の牌をすべて抽出
    const tiles = [...match.matchAll(/__TILE__([^_]+)__TILE__/g)].map(m => m[1]);

    // 連続する同種の牌をグループ化
    const groups = groupConsecutiveTiles(tiles);

    if (groups.length === 1 && groups[0].match(/[0-9]+[mps]/)) {
      // 複数の同種牌が統合された場合 → Tiles コンポーネント
      return `<Tiles hand="${groups[0]}" />`;
    } else {
      // グループ化できなかった or 字牌が混ざっている → 個別のTileのまま
      return tiles.map(t => `<Tile tile="${t}" />`).join('');
    }
  });

  // 残りの単独タイルマーカーを変換
  tempContent = tempContent.replace(/__TILE__([^_]+)__TILE__/g, (_, notation) => {
    return `<Tile tile="${notation}" />`;
  });

  return { content: tempContent, replaced, needsImport };
}

// frontmatter直後にimport文を追加
function addImportStatement(content: string, useTiles: boolean): string {
  const frontmatterMatch = content.match(/^(---\n[\s\S]*?\n---\n)/);

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const restContent = content.slice(frontmatter.length);

    // 既にimportがある場合はスキップ
    if (restContent.includes("import Tile from 'mj-tiles/astro/Tile.astro'")) {
      return content;
    }

    let imports = "\nimport Tile from 'mj-tiles/astro/Tile.astro'\n";
    if (useTiles) {
      imports += "import Tiles from 'mj-tiles/astro/Tiles.astro'\n";
    }
    imports += "import 'mj-tiles/styles.css'\n";

    return `${frontmatter}${imports}${restContent}`;
  }

  return content;
}

// メイン処理
function main() {
  const mdxFiles = readdirSync(postsDir).filter(f => f.endsWith('.mdx'));

  let totalReplaced = 0;
  let filesModified = 0;
  let tilesUsed = 0;

  console.log('🎴 麻雀牌画像を mj-tiles に置き換えています...\n');

  for (const filename of mdxFiles) {
    const fullPath = join(postsDir, filename);
    const content = readFileSync(fullPath, 'utf-8');

    const { content: newContent, replaced, needsImport } = replaceTilesInMdx(content);

    if (replaced > 0) {
      const useTiles = newContent.includes('<Tiles hand=');
      let finalContent = newContent;

      if (needsImport) {
        finalContent = addImportStatement(newContent, useTiles);
      }

      writeFileSync(fullPath, finalContent, 'utf-8');

      const tilesCount = (finalContent.match(/<Tiles hand=/g) || []).length;
      console.log(`✅ ${filename}: ${replaced}個の牌を置き換え${tilesCount > 0 ? ` (Tiles: ${tilesCount})` : ''}`);
      totalReplaced += replaced;
      filesModified++;
      tilesUsed += tilesCount;
    }
  }

  console.log(`\n🎉 完了！`);
  console.log(`📊 ${filesModified}個のファイルで${totalReplaced}個の牌を置き換えました`);
  console.log(`📦 Tilesコンポーネント使用: ${tilesUsed}箇所`);
}

main();
