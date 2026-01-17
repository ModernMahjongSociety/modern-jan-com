# R2 画像アップロード手順

## 会員紹介ページの画像

### 1. 現在の状態

会員紹介ページ (`/member`) の画像は現在 `public/images/members/` に配置されています:

- `kobaken.png` - こばけん（会長）
- `takano.png` - バーニング高野（理事）
- `tamaba.jpg` - たまば（顧問）
- `koyayakko.png` - コヤヤッコ（顧問）

### 2. R2にアップロード

```bash
# プロジェクトルートから実行
./scripts/upload-members-to-r2.sh
```

**注意**: 事前に Wrangler でログインしておく必要があります:
```bash
npx wrangler login
```

### 3. R2カスタムドメイン設定

1. Cloudflare ダッシュボードにログイン
2. R2 → バケット (`modern-jan-images`) を選択
3. 「Settings」→「Public access」→「Custom Domains」
4. `r2.modern-jan.com` を追加
5. DNS設定が自動的に追加されることを確認

### 4. 画像URLを更新

R2へのアップロードとカスタムドメイン設定が完了したら、`src/pages/member.astro` の画像URLを更新:

#### 変更前（ローカル）:
```html
<img src="/images/members/kobaken.png" alt="こばけん" />
```

#### 変更後（R2）:
```html
<img src="https://r2.modern-jan.com/members/kobaken.png" alt="こばけん" />
```

または環境変数を使用:
```javascript
const R2_BASE_URL = import.meta.env.PUBLIC_R2_BASE_URL || 'https://r2.modern-jan.com';
```

```html
<img src={`${R2_BASE_URL}/members/kobaken.png`} alt="こばけん" />
```

### 5. ローカルで動作確認

```bash
npm run dev
```

http://localhost:4321/member にアクセスして、画像が正しく表示されることを確認。

### 6. デプロイ

```bash
npm run build
git add .
git commit -m "Add member images"
git push
```

Cloudflare Pages が自動的にデプロイします。

## その他の固定ページ画像

他の固定ページ（about, tutorial など）にも画像が必要な場合は、同様の手順でアップロードできます。

## 記事内画像の一括アップロード

ブログ記事内の画像は `scripts/convert-wordpress.ts` で自動的にR2 URLに変換されています:

```typescript
// 画像URLをR2に置換
cleaned = cleaned.replace(
  /https:\/\/modern-jan\.com\/wp-content\/uploads\//g,
  'https://r2.modern-jan.com/'
);
```

WordPressの `wp-content/uploads/` 以下の画像を R2 にアップロードする必要があります。
