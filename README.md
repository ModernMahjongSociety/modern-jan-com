# modern-jan.com

モダン麻雀の公式サイト - WordPress から Astro へ移行

## 技術スタック

- **Astro 5.x** - 静的サイトジェネレーター
- **Bun** - 高速JavaScriptランタイム（miseで管理）
- **dotenvx** - 環境変数管理
- **Cloudflare Pages** - ホスティング
- **Cloudflare R2** - 画像ストレージ
- **MDX** - Markdown + コンポーネント
- **mj-tiles** - 麻雀牌表示

## セットアップ

### 1. 前提条件

- [mise](https://mise.jdx.dev/) - ランタイムバージョン管理
- Git

### 2. リポジトリのクローン

```bash
git clone <repository-url>
cd modern-jan-hp
```

### 3. ランタイムのインストール

miseが自動的に`.mise.toml`から必要なランタイムをインストールします：

```bash
mise install
```

これにより以下がインストールされます：
- Bun 1.3.6+
- Node.js 20.x（Astro用）

### 4. 依存関係のインストール

```bash
bun install
```

### 5. 開発サーバーの起動

```bash
bun run dev
```

ブラウザで http://localhost:4321 を開きます。

## スクリプト

### 開発・ビルド

```bash
bun run dev      # 開発サーバー起動
bun run build    # 本番ビルド
bun run preview  # ビルド結果のプレビュー
```

### 画像管理（R2アップロード）

詳細は [docs/r2-upload-guide.md](./docs/r2-upload-guide.md) を参照してください。

```bash
# 環境変数の設定
cp .env.example .env
# .envファイルを編集してR2 APIトークンを設定

# 参照されている画像を抽出
bun run extract:images

# ドライラン（テスト）
bun run upload:images:dry

# 本番アップロード（変換なし）
bun run upload:images:no-convert

# 本番アップロード（AVIF変換）
bun run upload:images

# カスタムドメイン設定（r2.modern-jan.com）
bun run setup:r2-domain
```

## プロジェクト構造

```
.
├── src/
│   ├── components/       # Astroコンポーネント
│   ├── content/
│   │   ├── config.ts    # Content Collections設定
│   │   ├── posts/       # ブログ記事（MDX）
│   │   └── pages/       # 固定ページ（MDX）
│   ├── layouts/         # レイアウトコンポーネント
│   ├── pages/           # ページルーティング
│   └── styles/          # グローバルスタイル
├── public/
│   └── _redirects       # 301リダイレクト設定
├── scripts/             # ユーティリティスクリプト
├── docs/                # ドキュメント
└── logs/                # ログファイル
```

## Content Collections

### ブログ記事（posts）

`src/content/posts/*.mdx`

```yaml
---
title: 記事タイトル
description: 記事の説明
publishedAt: 2024-01-01
tags: [タグ1, タグ2]
category: カテゴリ
image: https://r2.modern-jan.com/path/to/image.jpg
legacySlug: /2024/01/01/old-slug/  # 旧URL（301リダイレクト用）
---
```

### 固定ページ（pages）

`src/content/pages/*.mdx`

```yaml
---
title: ページタイトル
description: ページの説明
---
```

## デプロイ

### Cloudflare Pagesへのデプロイ

1. Cloudflare Dashboard → Pages → Create a project
2. GitHubリポジトリを接続
3. ビルド設定：
   - **Framework preset**: Astro
   - **Build command**: `bun run build`
   - **Build output directory**: `dist`

## 環境変数

`.env`ファイルで管理（dotenvx使用）：

```env
# Cloudflare Account ID
CLOUDFLARE_ACCOUNT_ID=your-account-id

# Cloudflare API Token（カスタムドメイン設定用）
# Create at: https://dash.cloudflare.com/profile/api-tokens
# Template: Edit zone DNS
CLOUDFLARE_API_TOKEN=your-api-token

# R2 API Token（画像アップロード用）
# Create at: https://dash.cloudflare.com/ -> R2 -> Manage R2 API Tokens
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
```

## ドキュメント

- [R2画像アップロードガイド](./docs/r2-upload-guide.md)
- [WordPress移行プロンプト](./docs/modern-jan-migration-prompt.md)

## 参考リンク

- [Astro Documentation](https://docs.astro.build/)
- [Bun Documentation](https://bun.sh/)
- [dotenvx Documentation](https://dotenvx.com/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)

## ライセンス

All rights reserved.
