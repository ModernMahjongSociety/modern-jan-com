# modern-jan.com WordPress → Astro 移行プロンプト

## プロジェクト概要

麻雀研究会のブログサイト `modern-jan.com` をWordPressからAstroに移行する。
Cloudflare Pagesでホストし、**既存デザインとcatnose風ミニマルを融合**したデザインで刷新する。

**デザイン方針**:
- 既存サイトのブランドカラー・雰囲気を継承
- catnose風ミニマル（zenn.dev参考）の余白・シンプルさを取り入れる
- 麻雀コンテンツの読みやすさを最優先

**URL変更**: 旧 `/2022/04/13/haikouritsu/` → 新 `/blog/haikouritsu/`
301リダイレクトでSEO価値を引き継ぐ。

## 技術スタック

- **Framework**: Astro + MDX
- **Hosting**: Cloudflare Pages（静的生成）
- **画像ストレージ**: Cloudflare R2
- **コンポーネント**: mj-tiles（npm公開済み、Astro/AstroMDX対応）
- **DNS**: Cloudflare（設定済み）

## ディレクトリ構成

```
modern-jan/
├── src/
│   ├── content/
│   │   ├── config.ts          # Content Collections定義
│   │   └── posts/             # ブログ記事（MDX）
│   │       ├── haikouritsu.mdx
│   │       ├── mjrs.mdx
│   │       └── lucky-j.mdx
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── PostCard.astro
│   │   ├── TagList.astro
│   │   └── TableOfContents.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── PostLayout.astro
│   │   └── PageLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro        # 固定ページ
│   │   ├── member.astro
│   │   ├── tutorial.astro
│   │   ├── blog/
│   │   │   ├── index.astro    # 記事一覧
│   │   │   └── [slug].astro   # 記事詳細
│   │   └── tag/
│   │       └── [tag].astro
│   └── styles/
│       └── global.css
├── public/
│   ├── favicon.ico
│   └── _redirects             # 301リダイレクト設定
├── scripts/
│   └── convert-wordpress.ts   # XML→MDX変換スクリプト
├── astro.config.mjs
└── package.json
```

## 実装タスク

### Phase 1: プロジェクトセットアップ

1. Astroプロジェクト作成
```bash
npm create astro@latest modern-jan -- --template minimal --typescript strict
cd modern-jan
```

2. 必要パッケージインストール
```bash
npx astro add mdx cloudflare sitemap
npm install mj-tiles
npm install rehype-slug rehype-autolink-headings  # 目次用
npm install xml2js turndown       # WordPress変換用
```

3. `astro.config.mjs` 設定
```javascript
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

export default defineConfig({
  site: 'https://modern-jan.com',
  output: 'static',
  adapter: cloudflare(),
  integrations: [
    mdx(),
    sitemap(),
  ],
  markdown: {
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'wrap' }],
    ],
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
```

### Phase 2: Content Collections設定

`src/content/config.ts`:
```typescript
import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishedAt: z.coerce.date(),           // 日付でソート用
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    image: z.string().optional(),
    draft: z.boolean().default(false),
    // 旧URLからのリダイレクト用（任意）
    legacySlug: z.string().optional(),      // 例: "2022/04/13/haikouritsu"
  }),
});

export const collections = { posts };
```

### Phase 3: URL構造（シンプル版）

**新URL**: `/blog/haikouritsu/`

`src/pages/blog/[slug].astro`:
```astro
---
import { getCollection } from 'astro:content';
import PostLayout from '../../layouts/PostLayout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('posts');
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content, headings } = await post.render();
---
<PostLayout post={post} headings={headings}>
  <Content />
</PostLayout>
```

`src/pages/blog/index.astro`（記事一覧）:
```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';

// 日付降順でソート（ベストプラクティス）
const posts = (await getCollection('posts', ({ data }) => !data.draft))
  .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
---

<BaseLayout title="記事一覧">
  <h1>記事一覧</h1>
  <ul class="posts">
    {posts.map((post) => (
      <li>
        <PostCard post={post} />
      </li>
    ))}
  </ul>
</BaseLayout>
```

### Phase 3.5: 301リダイレクト設定

`public/_redirects`:
```
# 旧WordPress URL → 新Astro URL
/2022/04/13/haikouritsu/  /blog/haikouritsu/  301
/2022/07/19/mjrs/         /blog/mjrs/         301
/2023/09/05/middle_haikouritsu/  /blog/middle-haikouritsu/  301
/2023/09/06/lucky-j/      /blog/lucky-j/      301
# ... 他の記事も同様に追加

# タグページ（変更がある場合）
# /tag/akochan/  /tag/akochan/  301
```

**Note**: XMLから記事を変換する際に、このリダイレクトリストも自動生成すると便利。

### Phase 4: WordPress XML → MDX 変換スクリプト

`scripts/convert-wordpress.ts`:
```typescript
import { parseStringPromise } from 'xml2js';
import TurndownService from 'turndown';
import * as fs from 'fs/promises';
import * as path from 'path';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

interface WPPost {
  title: string;
  slug: string;
  date: string;
  content: string;
  categories: string[];
  tags: string[];
  status: string;
}

interface Redirect {
  from: string;
  to: string;
}

async function parseWordPressXML(xmlPath: string): Promise<WPPost[]> {
  const xml = await fs.readFile(xmlPath, 'utf-8');
  const result = await parseStringPromise(xml);
  
  const items = result.rss.channel[0].item || [];
  
  return items
    .filter((item: any) => item['wp:post_type']?.[0] === 'post')
    .filter((item: any) => item['wp:status']?.[0] === 'publish')
    .map((item: any) => ({
      title: item.title[0],
      slug: item['wp:post_name'][0],
      date: item['wp:post_date'][0],
      content: item['content:encoded']?.[0] || '',
      categories: item.category
        ?.filter((c: any) => c.$.domain === 'category')
        ?.map((c: any) => c._) || [],
      tags: item.category
        ?.filter((c: any) => c.$.domain === 'post_tag')
        ?.map((c: any) => c._) || [],
      status: item['wp:status'][0],
    }));
}

function htmlToMdx(html: string): string {
  let cleaned = html
    .replace(/<!-- wp:.*? -->/g, '')
    .replace(/<!-- \/wp:.*? -->/g, '')
    .replace(/\r\n/g, '\n');
  
  // 画像URLをR2に置換
  cleaned = cleaned.replace(
    /https:\/\/modern-jan\.com\/wp-content\/uploads\//g,
    'https://r2.modern-jan.com/'
  );
  
  return turndown.turndown(cleaned);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateLegacySlug(dateStr: string, slug: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}/${slug}`;
}

async function convertToMDX(posts: WPPost[], outputDir: string): Promise<Redirect[]> {
  await fs.mkdir(outputDir, { recursive: true });
  
  const redirects: Redirect[] = [];
  
  for (const post of posts) {
    const dateFormatted = formatDate(post.date);
    const legacySlug = generateLegacySlug(post.date, post.slug);
    
    // ファイル名はslugのみ（日付なし）
    const filename = `${post.slug}.mdx`;
    
    const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
publishedAt: ${dateFormatted}
tags: [${post.tags.map(t => `"${t}"`).join(', ')}]
category: "${post.categories[0] || ''}"
legacySlug: "${legacySlug}"
---`;

    const content = htmlToMdx(post.content);
    const mdx = `${frontmatter}\n\n${content}\n`;
    
    await fs.writeFile(path.join(outputDir, filename), mdx, 'utf-8');
    console.log(`Created: ${filename}`);
    
    // リダイレクト情報を収集
    redirects.push({
      from: `/${legacySlug}/`,
      to: `/blog/${post.slug}/`,
    });
  }
  
  return redirects;
}

async function generateRedirectsFile(redirects: Redirect[], outputPath: string) {
  const content = [
    '# 旧WordPress URL → 新Astro URL (自動生成)',
    '',
    ...redirects.map(r => `${r.from}  ${r.to}  301`),
    '',
  ].join('\n');
  
  await fs.writeFile(outputPath, content, 'utf-8');
  console.log(`Created: ${outputPath}`);
}

// 実行
const xmlPath = process.argv[2] || './wordpress-export.xml';
const outputDir = './src/content/posts';
const redirectsPath = './public/_redirects';

parseWordPressXML(xmlPath)
  .then(async (posts) => {
    const redirects = await convertToMDX(posts, outputDir);
    await generateRedirectsFile(redirects, redirectsPath);
  })
  .then(() => console.log('Done!'))
  .catch(console.error);
```

実行方法:
```bash
npx tsx scripts/convert-wordpress.ts ./wordpress-export.xml
```

出力:
- `src/content/posts/*.mdx` - 記事ファイル
- `public/_redirects` - 301リダイレクト設定（自動生成）

### Phase 5: 画像のR2移行

1. WordPressから画像をダウンロード
```bash
# wp-content/uploads/ 以下をローカルにダウンロード
```

2. Cloudflare R2バケット作成
```bash
# Cloudflareダッシュボードで作成
# バケット名: modern-jan-images
```

3. カスタムドメイン設定: `r2.modern-jan.com`

4. 画像アップロード（Wrangler CLI使用）
```bash
npx wrangler r2 object put modern-jan-images/2022/04/image.jpg --file ./uploads/2022/04/image.jpg
```

### Phase 6: OGP画像（外部API使用）

既存の `https://github.com/kbkn3/ogp-image-generator` を使用。
Cloudflare Workerで動作するOGP画像生成API。

**使用方法**: クエリパラメータで動的に画像を生成

```html
<meta property='og:image' content='https://{your-worker}.workers.dev/gensya?title=タイトル&subTitle=サブタイトル&siteTitle=モダンジャン研究会' />
```

`src/layouts/PostLayout.astro` でのOGP設定:
```astro
---
// ... 省略

const { title, description, publishedAt, tags, image } = post.data;

// OGP画像URL生成
const OGP_API_BASE = 'https://{your-worker}.workers.dev';  // デプロイ後に設定
const ogImageUrl = image 
  ? image 
  : `${OGP_API_BASE}/gensya?${new URLSearchParams({
      title: title,
      subTitle: tags[0] || '',
      siteTitle: 'モダンジャン研究会',
    }).toString()}`;
---
```

`src/layouts/BaseLayout.astro` でのmeta設定:
```astro
---
interface Props {
  title: string;
  description?: string;
  ogImage?: string;
}

const { title, description, ogImage } = Astro.props;
const siteTitle = 'モダンジャン研究会';
const fullTitle = `${title} | ${siteTitle}`;

// デフォルトOGP画像
const OGP_API_BASE = 'https://{your-worker}.workers.dev';
const defaultOgImage = `${OGP_API_BASE}/gensya?${new URLSearchParams({
  title: siteTitle,
  subTitle: '麻雀研究',
  siteTitle: siteTitle,
}).toString()}`;
---

<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{fullTitle}</title>
  <meta name="description" content={description || ''} />
  
  <!-- OGP -->
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description || ''} />
  <meta property="og:image" content={ogImage || defaultOgImage} />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content={siteTitle} />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={fullTitle} />
  <meta name="twitter:description" content={description || ''} />
  <meta name="twitter:image" content={ogImage || defaultOgImage} />
  
  <link rel="icon" href="/favicon.ico" />
</head>
<body>
  <slot />
</body>
</html>
```

**Note**: 
- `{your-worker}` は実際のWorkerのURLに置き換える
- 環境変数化する場合は `import.meta.env.PUBLIC_OGP_API_BASE` を使用
- 記事に `image` が設定されていればそちらを優先

### Phase 7: 目次コンポーネント

`src/components/TableOfContents.astro`:
```astro
---
interface Props {
  headings: { depth: number; slug: string; text: string }[];
}

const { headings } = Astro.props;
const toc = headings.filter((h) => h.depth >= 2 && h.depth <= 3);
---

{toc.length > 0 && (
  <nav class="toc">
    <details open>
      <summary>目次</summary>
      <ul>
        {toc.map((heading) => (
          <li style={`margin-left: ${(heading.depth - 2) * 16}px`}>
            <a href={`#${heading.slug}`}>{heading.text}</a>
          </li>
        ))}
      </ul>
    </details>
  </nav>
)}

<style>
  .toc {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px 20px;
    margin: 24px 0;
  }
  
  summary {
    font-weight: 600;
    cursor: pointer;
    color: #334155;
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 12px 0 0 0;
  }
  
  li {
    margin: 8px 0;
  }
  
  a {
    color: #64748b;
    text-decoration: none;
    font-size: 14px;
  }
  
  a:hover {
    color: #0f172a;
    text-decoration: underline;
  }
</style>
```

### Phase 8: 記事レイアウト

`src/layouts/PostLayout.astro`:
```astro
---
import BaseLayout from './BaseLayout.astro';
import TableOfContents from '../components/TableOfContents.astro';
import TagList from '../components/TagList.astro';

interface Props {
  post: {
    data: {
      title: string;
      description?: string;
      publishedAt: Date;
      updatedAt?: Date;
      tags: string[];
      category?: string;
      image?: string;
    };
    slug: string;
  };
  headings: { depth: number; slug: string; text: string }[];
}

const { post, headings } = Astro.props;
const { title, description, publishedAt, updatedAt, tags, image } = post.data;

// OGP画像URL（外部API使用）
const OGP_API_BASE = import.meta.env.PUBLIC_OGP_API_BASE || 'https://ogp-image-creator.ken0421wabu.workers.dev';
const ogImageUrl = image 
  ? image 
  : `${OGP_API_BASE}/gensya?${new URLSearchParams({
      title: title,
      subTitle: tags[0] || '',
      siteTitle: 'モダンジャン研究会',
    }).toString()}`;
---

<BaseLayout 
  title={title} 
  description={description}
  ogImage={ogImageUrl}
>
  <article class="post">
    <header>
      <h1>{title}</h1>
      <div class="meta">
        <time datetime={publishedAt.toISOString()}>
          {publishedAt.toLocaleDateString('ja-JP')}
        </time>
        {updatedAt && (
          <span class="updated">
            （更新: {updatedAt.toLocaleDateString('ja-JP')}）
          </span>
        )}
      </div>
      <TagList tags={tags} />
    </header>
    
    <TableOfContents headings={headings} />
    
    <div class="content">
      <slot />
    </div>
  </article>
</BaseLayout>

<style>
  .post {
    max-width: 768px;
    margin: 0 auto;
    padding: 40px 20px;
  }
  
  h1 {
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.3;
    margin-bottom: 16px;
    color: #0f172a;
  }
  
  .meta {
    color: #64748b;
    font-size: 14px;
    margin-bottom: 12px;
  }
  
  .updated {
    color: #94a3b8;
  }
  
  .content {
    margin-top: 32px;
    line-height: 1.8;
    color: #334155;
  }
  
  .content :global(h2) {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 48px;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .content :global(h3) {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 32px;
    margin-bottom: 12px;
  }
  
  .content :global(p) {
    margin: 16px 0;
  }
  
  .content :global(a) {
    color: #2563eb;
    text-decoration: underline;
  }
  
  .content :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 24px 0;
  }
  
  .content :global(pre) {
    background: #1e293b;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 24px 0;
  }
  
  .content :global(code) {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
  }
  
  .content :global(:not(pre) > code) {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    color: #be185d;
  }
</style>
```

### Phase 9: タグページ

`src/pages/tag/[tag].astro`:
```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';

export async function getStaticPaths() {
  const posts = await getCollection('posts');
  const tags = [...new Set(posts.flatMap((post) => post.data.tags))];
  
  return tags.map((tag) => ({
    params: { tag },
    props: {
      tag,
      posts: posts
        .filter((post) => post.data.tags.includes(tag))
        .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime()),
    },
  }));
}

const { tag, posts } = Astro.props;
---

<BaseLayout title={`${tag} の記事一覧`}>
  <div class="tag-page">
    <h1>
      <span class="label">タグ:</span>
      {tag}
    </h1>
    <p class="count">{posts.length}件の記事</p>
    
    <ul class="posts">
      {posts.map((post) => (
        <li>
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  </div>
</BaseLayout>

<style>
  .tag-page {
    max-width: 768px;
    margin: 0 auto;
    padding: 40px 20px;
  }
  
  h1 {
    font-size: 1.5rem;
    margin-bottom: 8px;
  }
  
  .label {
    color: #64748b;
    font-weight: 400;
  }
  
  .count {
    color: #64748b;
    margin-bottom: 32px;
  }
  
  .posts {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
```

### Phase 10: 固定ページ

固定ページは直接 `.astro` ファイルとして作成（シンプルに管理）。

`src/pages/about.astro`:
```astro
---
import PageLayout from '../layouts/PageLayout.astro';
---

<PageLayout title="団体概要" description="モダンジャン研究会について">
  <h1>団体概要</h1>
  
  <section>
    <h2>設立</h2>
    <p>2020年8月16日</p>
  </section>
  
  <section>
    <h2>会長</h2>
    <p>こばけん</p>
  </section>
  
  <section>
    <h2>活動趣旨</h2>
    <p>
      麻雀は、日本人日常生活に深く根差す大衆娯楽であると同時に、
      極限の集中力と判断力、論理的思考に加えて、勝負勘をも鍛えることができる
      素晴らしい頭脳スポーツです。
    </p>
    <!-- 以下、WordPressからコンテンツを移行 -->
  </section>
</PageLayout>
```

同様に `/member.astro`, `/tutorial.astro` も作成。

**または** MDXで管理したい場合:

`src/content/pages/about.mdx` を作成し、Content Collectionsに `pages` を追加:

```typescript
// config.ts に追加
const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { posts, pages };
```

### Phase 11: デザイン（既存 + catnose風ミニマルの融合）

#### デザインコンセプト

**既存サイトから継承する要素**:
- モダンジャン研究会のブランドアイデンティティ
- 麻雀コンテンツに適した落ち着いた配色
- 記事の読みやすさを重視したレイアウト

**catnose風ミニマルの特徴**（参考: zenn.dev, catnose.me）:
- 余白を贅沢に使う
- 装飾を最小限に抑える
- シャドウは控えめ、ボーダーは細く
- システムフォント優先
- コントラストを抑えた配色

#### カラーパレット

`src/styles/global.css`:
```css
:root {
  /* ベースカラー */
  --color-bg: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;
  
  /* テキスト */
  --color-text-primary: #1e293b;
  --color-text-secondary: #475569;
  --color-text-tertiary: #94a3b8;
  
  /* アクセント（既存サイトのブランドカラーに合わせて調整） */
  --color-accent: #2563eb;
  --color-accent-hover: #1d4ed8;
  
  /* ボーダー */
  --color-border: #e2e8f0;
  --color-border-light: #f1f5f9;
  
  /* 麻雀テーマカラー（既存から継承） */
  --color-mahjong-green: #1a472a;
  --color-mahjong-accent: #2d5a3d;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', 
               'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif;
  color: var(--color-text-primary);
  background-color: var(--color-bg);
  line-height: 1.8;
}

/* リンク */
a {
  color: var(--color-accent);
  text-decoration: none;
  transition: color 0.15s ease;
}

a:hover {
  color: var(--color-accent-hover);
}

/* 選択時 */
::selection {
  background-color: var(--color-accent);
  color: white;
}
```

#### コンポーネントスタイル

`src/components/Header.astro`:
```astro
---
const navItems = [
  { href: '/', label: 'ホーム' },
  { href: '/blog/', label: '記事一覧' },
  { href: '/about/', label: '団体概要' },
  { href: '/member/', label: '会員紹介' },
];
---

<header class="header">
  <div class="header-inner">
    <a href="/" class="logo">
      モダンジャン研究会
    </a>
    <nav class="nav">
      {navItems.map(item => (
        <a href={item.href} class="nav-link">{item.label}</a>
      ))}
    </nav>
  </div>
</header>

<style>
  .header {
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .header-inner {
    max-width: 1024px;
    margin: 0 auto;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .logo {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }
  
  .logo:hover {
    color: var(--color-text-primary);
  }
  
  .nav {
    display: flex;
    gap: 24px;
  }
  
  .nav-link {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
  
  .nav-link:hover {
    color: var(--color-text-primary);
  }
  
  @media (max-width: 640px) {
    .header-inner {
      padding: 12px 16px;
    }
    
    .nav {
      gap: 16px;
    }
    
    .nav-link {
      font-size: 0.8125rem;
    }
  }
</style>
```

`src/components/PostCard.astro`:
```astro
---
interface Props {
  post: {
    slug: string;
    data: {
      title: string;
      description?: string;
      publishedAt: Date;
      tags: string[];
    };
  };
}

const { post } = Astro.props;
const { title, description, publishedAt, tags } = post.data;
---

<article class="post-card">
  <a href={`/blog/${post.slug}/`} class="post-link">
    <h2 class="post-title">{title}</h2>
    {description && <p class="post-description">{description}</p>}
    <div class="post-meta">
      <time datetime={publishedAt.toISOString()}>
        {publishedAt.toLocaleDateString('ja-JP')}
      </time>
      {tags.length > 0 && (
        <span class="post-tags">
          {tags.slice(0, 3).map(tag => (
            <span class="tag">{tag}</span>
          ))}
        </span>
      )}
    </div>
  </a>
</article>

<style>
  .post-card {
    padding: 20px 0;
    border-bottom: 1px solid var(--color-border-light);
  }
  
  .post-card:last-child {
    border-bottom: none;
  }
  
  .post-link {
    display: block;
    color: inherit;
  }
  
  .post-link:hover .post-title {
    color: var(--color-accent);
  }
  
  .post-title {
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.5;
    margin-bottom: 8px;
    transition: color 0.15s ease;
  }
  
  .post-description {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin-bottom: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .post-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.8125rem;
    color: var(--color-text-tertiary);
  }
  
  .post-tags {
    display: flex;
    gap: 6px;
  }
  
  .tag {
    background: var(--color-bg-tertiary);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
  }
</style>
```

`src/components/Footer.astro`:
```astro
---
const currentYear = new Date().getFullYear();
---

<footer class="footer">
  <div class="footer-inner">
    <p class="copyright">
      © {currentYear} モダンジャン研究会
    </p>
    <nav class="footer-nav">
      <a href="/about/">団体概要</a>
      <a href="/member/">会員紹介</a>
    </nav>
  </div>
</footer>

<style>
  .footer {
    border-top: 1px solid var(--color-border);
    margin-top: 80px;
    padding: 40px 24px;
  }
  
  .footer-inner {
    max-width: 1024px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .copyright {
    font-size: 0.8125rem;
    color: var(--color-text-tertiary);
  }
  
  .footer-nav {
    display: flex;
    gap: 24px;
  }
  
  .footer-nav a {
    font-size: 0.8125rem;
    color: var(--color-text-tertiary);
  }
  
  .footer-nav a:hover {
    color: var(--color-text-secondary);
  }
  
  @media (max-width: 640px) {
    .footer-inner {
      flex-direction: column;
      gap: 16px;
    }
  }
</style>
```

#### デザイン原則まとめ

| 要素 | 方針 |
|------|------|
| **余白** | 広めに（padding: 40px以上、gap: 24px以上） |
| **フォントサイズ** | 本文16px、見出しは控えめに大きく |
| **ボーダー** | 1px solid、色は薄く |
| **シャドウ** | 基本的に使わない |
| **角丸** | 控えめに（4px〜8px） |
| **アニメーション** | 控えめに（0.15s ease） |
| **カード** | 背景色の差分で区別、枠線は最小限 |
| **色数** | 最小限に抑える（アクセント1色） |

#### 参考サイト

- https://zenn.dev - 記事一覧、記事詳細のレイアウト
- https://catnose.me - シンプルなポートフォリオ
- 既存 modern-jan.com - ブランドカラー、雰囲気

### Phase 12: デプロイ

1. GitHubリポジトリ作成 & push
2. Cloudflare Pagesで接続
3. ビルド設定:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: `18` 以上
4. Environment variables（必要に応じて）
5. カスタムドメイン `modern-jan.com` 設定

## 入力ファイル

作業開始前に以下を準備:

1. `wordpress-export.xml` - WordPress管理画面 → ツール → エクスポート
2. `wp-content/uploads/` - 画像ファイル一式

## mj-tiles の使用方法

MDX内での使用例:
```mdx
---
title: "牌効率の基本"
publishedAt: 2022-04-13
tags: ["牌効率"]
---

import { MjTiles } from 'mj-tiles/astro';

## 基本形

<MjTiles tiles="123m456p789s11z" />

これは一盃口の形です。
```

## チェックリスト

- [ ] Astroプロジェクト作成
- [ ] パッケージインストール
- [ ] Content Collections設定
- [ ] レイアウト作成（Base, Post, Page）
- [ ] コンポーネント作成（Header, Footer, PostCard, TagList, TOC）
- [ ] WordPress XML変換スクリプト実行
- [ ] `_redirects` ファイル生成確認
- [ ] 変換後のMDXを手動レビュー・修正
- [ ] 固定ページ作成
- [ ] R2バケット作成 & 画像アップロード
- [ ] OGP画像API（ogp-image-generator）デプロイ確認
- [ ] タグページ実装
- [ ] スタイリング（既存 + catnose風ミニマルの融合）
- [ ] ローカル動作確認（全URL）
- [ ] Cloudflare Pages デプロイ
- [ ] 301リダイレクト動作確認
- [ ] 本番動作確認
- [ ] 旧WordPress停止

## 注意事項

1. **301リダイレクトを忘れずに** - `public/_redirects` が正しく生成されているか確認
2. **mj-tiles** は必ず `mj-tiles/astro` からimport
3. **OGP画像** は外部API（ogp-image-generator）を使用、記事に画像があればそちらを優先
4. **XMLパース** はUTF-8確認、特殊文字のエスケープに注意
5. **R2** のカスタムドメインは `r2.modern-jan.com` で設定
6. **日付ソート** は `getCollection()` 後に `.sort()` で行う（Astroのベストプラクティス）
7. **OGP API URL** は環境変数 `PUBLIC_OGP_API_BASE` で管理推奨
