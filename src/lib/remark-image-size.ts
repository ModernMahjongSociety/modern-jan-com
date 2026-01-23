import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Image, Root } from 'mdast';

/**
 * MDXの画像alt属性からサイズ指定を検出し、data属性に変換するRemarkプラグイン
 *
 * 使用例：
 * ![small:画像の説明](url)  → data-size="small"で、alt="画像の説明"
 * ![medium:画像の説明](url) → data-size="medium"で、alt="画像の説明"
 * ![large:画像の説明](url)  → data-size="large"で、alt="画像の説明"
 * ![画像の説明](url)        → サイズ指定なし、alt="画像の説明"
 */
export const remarkImageSize: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'image', (node: Image) => {
      const alt = node.alt || '';

      // alt属性からサイズ指定を抽出（形式: "size:説明" または "説明|size"）
      const sizeMatch = alt.match(/^(small|medium|large):(.*)$/) ||
                       alt.match(/^(.*)\|(small|medium|large)$/);

      if (sizeMatch) {
        let size: string;
        let cleanAlt: string;

        // "size:説明" 形式
        if (alt.match(/^(small|medium|large):/)) {
          size = sizeMatch[1];
          cleanAlt = sizeMatch[2].trim();
        }
        // "説明|size" 形式
        else {
          size = sizeMatch[2];
          cleanAlt = sizeMatch[1].trim();
        }

        // data-size属性を追加
        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties['data-size'] = size;

        // alt属性からサイズ指定を削除
        node.alt = cleanAlt;
      }
    });
  };
};
