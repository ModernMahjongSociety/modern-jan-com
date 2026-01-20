# mj-tiles styling.md への追加提案

以下の内容を `docs/styling.md` に追加することを提案します。

---

## トラブルシューティング

### 画像が大きく表示される / スタイルが効かない

mj-tilesの画像が意図したサイズで表示されない場合、プロジェクトのCSSとの**詳細度（specificity）の競合**が原因である可能性があります。

#### 原因

多くのプロジェクトでは、リセットCSSやレイアウトスタイルで`img`要素に対してスタイルを設定しています：

```css
/* よくあるリセットCSS */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* レイアウトスタイルの例 */
.content img {
  height: auto;
  border-radius: 8px;
  margin: 24px 0;
}
```

これらのスタイルがmj-tilesの`.mj-tile`クラスより高い詳細度を持つ場合、`height: auto`が適用され、画像が元のサイズ（非常に大きい）で表示されます。

| セレクタ | 詳細度 |
|----------|--------|
| `.mj-tile` | (0, 1, 0) |
| `img` | (0, 0, 1) |
| `.content img` | (0, 1, 1) ← `.mj-tile`より高い |

#### 解決方法

**方法1: 競合するスタイルからmj-tileを除外する（推奨）**

```css
/* Before */
.content img {
  height: auto;
  border-radius: 8px;
  margin: 24px 0;
}

/* After */
.content img:not(.mj-tile) {
  height: auto;
  border-radius: 8px;
  margin: 24px 0;
}
```

**方法2: 高い詳細度でmj-tileのスタイルを定義する**

```css
/* グローバルCSSに追加 */
img.mj-tile {
  display: inline-block;
  height: 2em;  /* お好みのサイズに調整 */
  width: auto;
  vertical-align: -0.4em;
}
```

#### Astro での例

Astroのスコープ付きスタイルで`:global()`を使用している場合：

```astro
<style>
  /* Before */
  .content :global(img) {
    height: auto;
    border-radius: 8px;
    margin: 24px 0;
  }

  /* After */
  .content :global(img:not(.mj-tile)) {
    height: auto;
    border-radius: 8px;
    margin: 24px 0;
  }
</style>
```

### サイズのカスタマイズ

デフォルトのサイズ（`height: 1.5em`）を変更したい場合は、以下のようにCSSを追加してください：

```css
img.mj-tile {
  height: 2em;  /* 大きめ */
  vertical-align: -0.4em;  /* サイズに応じて調整 */
}
```

`em`単位を使用することで、周囲のテキストサイズに応じて自動的にスケールします。

---

## 補足: なぜ `import 'mj-tiles/styles.css'` だけでは不十分な場合があるのか

mj-tilesのスタイルシートをインポートしても、以下の理由でスタイルが効かないことがあります：

1. **CSSの読み込み順序**: プロジェクトのグローバルCSSやレイアウトスタイルが後に読み込まれると、同じ詳細度のスタイルは上書きされる
2. **詳細度の競合**: `.content img`のような複合セレクタは`.mj-tile`より詳細度が高い
3. **フレームワーク固有の挙動**: Astroのスコープ付きスタイルなど、フレームワークによってはスタイルの適用順序が異なる

これらの問題を回避するため、プロジェクト側でmj-tileを除外する設定を追加することを推奨します。
