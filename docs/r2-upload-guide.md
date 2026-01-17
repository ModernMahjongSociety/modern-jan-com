# R2画像アップロードガイド

## 概要

このプロジェクトでは、ブログ記事で実際に参照されている画像のみをCloudflare R2にアップロードします。
アップロード時に画像をAVIF形式に変換して最適化します（オプションでスキップ可能）。

**最適化結果**: 1,849ファイル → **103ファイル**（実際に参照されている画像のみ）

参考記事: https://eiji.page/blog/manage-image-to-r2/

## 1. R2 APIトークンの作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にアクセス
2. 左メニューから「R2」を選択
3. 「Manage R2 API Tokens」をクリック
4. 「Create API Token」をクリック
5. 以下の設定で作成：
   - **Permission**: Object Read & Write
   - **Bucket**: modern-jan-images（または All bucketsを選択）
   - **TTL**: 無期限またはお好みで
6. 「Create API Token」ボタンをクリック
7. **Access Key ID**と**Secret Access Key**をコピー（この画面を閉じると二度と表示されません）

## 2. 環境変数の設定

このプロジェクトでは**dotenvx**を使用して環境変数を管理しています。

### 2.1. .envファイルの作成

`.env.example`をコピーして`.env`ファイルを作成：

```bash
cp .env.example .env
```

### 2.2. APIトークンの設定

`.env`ファイルを開いて、APIトークンの情報を記入：

```env
CLOUDFLARE_ACCOUNT_ID=30cbe6a974969f022fb5deb3c755b419
R2_ACCESS_KEY_ID=your-actual-access-key-id
R2_SECRET_ACCESS_KEY=your-actual-secret-access-key
```

**注意**: `.env`ファイルは`.gitignore`に含まれているため、Gitにコミットされません。

## 3. 参照画像の抽出（オプション）

すでに実行済みですが、記事から参照されている画像を再抽出する場合：

```bash
bun run extract:images
```

結果は `logs/referenced-images.json` に保存されます。

- 総画像URL数: 103
- ローカルに存在: 103
- 不足: 0

## 4. アップロードの実行

すべてのコマンドは**dotenvx**を使用して自動的に`.env`ファイルから環境変数を読み込みます。

### ドライラン（テスト実行）【推奨：初回】

実際にアップロードせず、処理内容を確認：

```bash
bun run upload:images:dry
```

### 本番実行（AVIF変換あり）【推奨】

画像をAVIF形式に変換して最適化してアップロード：

```bash
bun run upload:images
```

- 103ファイルの処理に約2-3分
- ファイルサイズが大幅に削減されます（70-90%削減が期待できます）
- 変換後のファイル名は元の名前に`.avif`拡張子がつきます
- **注意**: AVIF変換後は、MDXファイル内のURL更新が必要

### 本番実行（変換なし）

元の画像形式のままアップロード：

```bash
bun run upload:images:no-convert
```

- URLの更新が不要
- ファイルサイズはそのまま

## 5. MDXファイル内のURL更新（AVIF変換時のみ）

AVIF変換でアップロードした場合、以下のスクリプトでMDXファイル内のURLを一括更新：

```bash
# 例: .jpg → .avif に変更
find src/content/posts -name "*.mdx" -exec sed -i '' 's/\.jpg)/\.avif)/g' {} +
find src/content/posts -name "*.mdx" -exec sed -i '' 's/\.png)/\.avif)/g' {} +
find src/content/posts -name "*.mdx" -exec sed -i '' 's/\.jpeg)/\.avif)/g' {} +
```

## 6. カスタムドメインの設定

R2バケットにカスタムドメイン`r2.modern-jan.com`を設定します。

### 方法1: wrangler CLIで設定（推奨）

Cloudflare API Tokenを作成して、wranglerコマンドで自動設定します。

#### 1. Cloudflare API Tokenの作成

1. https://dash.cloudflare.com/profile/api-tokens にアクセス
2. 「Create Token」をクリック
3. **Template**: 「Edit zone DNS」を選択
4. **Zone Resources**: `modern-jan.com`を選択
5. 「Continue to summary」→「Create Token」
6. トークンをコピーして`.env`ファイルに追加：

```env
CLOUDFLARE_API_TOKEN=your-api-token-here
```

#### 2. カスタムドメインを設定

```bash
bun run setup:r2-domain
```

このスクリプトは自動的に：
- Zone IDを取得
- R2バケットにカスタムドメインを追加
- DNSレコードを設定

### 方法2: 手動で設定

Cloudflare Dashboardから手動で設定する場合：

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にアクセス
2. R2 → `modern-jan-images`バケットを選択
3. 「Settings」タブ → 「Custom Domains」セクション
4. 「Connect Domain」をクリック
5. `r2.modern-jan.com`を入力
6. DNSレコードが自動的に追加されます

## 7. アップロード後の確認

### R2ダッシュボードで確認

1. Cloudflare Dashboard → R2 → `modern-jan-images`
2. オブジェクト数とストレージサイズを確認
3. 期待値: 103オブジェクト（変換なし）または 103オブジェクト（AVIF変換）

### 画像URLのテスト

**変換なしの場合:**
```
https://r2.modern-jan.com/2022/04/FDFS54GaUAAkqTe-902x1024.jpg
```

**AVIF変換の場合:**
```
https://r2.modern-jan.com/2022/04/FDFS54GaUAAkqTe-902x1024.avif
```

ブラウザでアクセスして画像が表示されることを確認します。

## トラブルシューティング

### エラー: "R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set"

環境変数が設定されていません。上記の手順2を再確認してください。

### エラー: "AccessDenied"

APIトークンの権限が不足しています。「Object Read & Write」権限があることを確認してください。

### エラー: "Cannot find module '/Users/kenta/repo/modern-jan-hp/logs/referenced-images.json'"

画像抽出を実行してください：
```bash
bun run extract:images
```

### 変換が遅い

sharp（画像変換ライブラリ）の処理は時間がかかります。
変換をスキップする場合は`bun run upload:images:no-convert`を使用してください。

## 推奨フロー

1. **環境変数の設定**
   ```bash
   cp .env.example .env
   # .envファイルを編集してR2 APIトークンを設定
   ```

2. **初回**: ドライランで確認
   ```bash
   bun run upload:images:dry
   ```

3. **変換なしでアップロード**（URL更新不要のため推奨）
   ```bash
   bun run upload:images:no-convert
   ```

4. **カスタムドメイン設定**
   ```bash
   # Cloudflare API Tokenを.envに追加してから実行
   bun run setup:r2-domain
   ```

5. **動作確認**
   ブラウザで画像URLにアクセスして表示を確認
   ```
   https://r2.modern-jan.com/2022/04/FDFS54GaUAAkqTe-902x1024.avif
   ```

## ファイル一覧

- `scripts/extract-referenced-images.ts` - MDXから画像URLを抽出
- `scripts/optimize-and-upload-images.ts` - 画像を最適化してR2にアップロード
- `scripts/setup-r2-custom-domain.ts` - R2カスタムドメインを自動設定
- `logs/referenced-images.json` - 参照されている画像のリスト（103ファイル）
- `.env` - 環境変数（dotenvxで管理）
- `package.json` - スクリプトコマンド定義

## 技術スタック

- **Bun**: 高速なJavaScriptランタイム（miseで管理）
- **dotenvx**: 環境変数管理ツール
- **sharp**: 画像変換ライブラリ（AVIF対応）
- **AWS SDK for JavaScript v3**: R2アップロード用

## 参考情報

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Bun Documentation](https://bun.sh/)
- [dotenvx Documentation](https://dotenvx.com/)
- [sharp Documentation](https://sharp.pixelplumbing.com/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html)
- [AVIF Browser Support](https://caniuse.com/avif) - 94%対応（2024年11月時点）
