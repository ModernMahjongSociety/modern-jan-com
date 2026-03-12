# SEO/AIO 総合分析レポート

**対象サイト**: modern-jan.com（モダンジャン研究会）
**分析日**: 2026-03-12
**分析対象**: ソースコード全体（Astro + Cloudflare Workers）

---

## 総合評価サマリー

| 分析観点 | 評価 | 重要度 |
|---------|------|-------|
| 1. メタタグ & OGP | B | 高 |
| 2. 構造化データ (JSON-LD) | **F** | **最高** |
| 3. テクニカルSEO | C | 高 |
| 4. コンテンツ & 見出し構造 | B | 中 |
| 5. クローラビリティ & インデックス | D | 高 |
| 6. AIO（AI最適化） | **F** | **最高** |
| 7. 画像 & メディア最適化 | C | 中 |
| 8. アクセシビリティ & UX | C | 中 |
| 9. 日本語SEO | B | 中 |

**A=優秀 B=良好 C=改善余地あり D=問題あり F=未対応**

---

## 1. メタタグ & OGP（評価: B）

### 良い点
- `<title>` タグが `{title} | モダンジャン研究会` 形式で全ページに設定されている（`BaseLayout.astro:26`）
- `<meta name="description">` がフォールバック付きで設定されている（`BaseLayout.astro:27`）
- OGP タグ（og:title, og:description, og:image, og:type, og:site_name, og:url）が全て設定（`BaseLayout.astro:29-35`）
- Twitter Card タグ（summary_large_image）が設定されている（`BaseLayout.astro:38-41`）
- 記事ごとの OGP 画像が自動生成されている（`PostLayout.astro:31-33`）

### 問題点

#### [critical] og:type が常に "website" 固定
- **現状**: `BaseLayout.astro:33` で `og:type` が `"website"` にハードコード
- **問題**: ブログ記事ページでは `"article"` であるべき
- **修正案**: PostLayout から BaseLayout に `ogType` prop を渡す。記事ページでは `article:published_time`, `article:modified_time`, `article:tag` も追加

#### [high] canonical URL が設定されていない
- **現状**: `<link rel="canonical">` が BaseLayout.astro に存在しない
- **問題**: 重複コンテンツの判定やレガシーURLからのリダイレクト先を明示できない
- **修正案**: `<link rel="canonical" href={Astro.url.href} />` を `<head>` に追加

#### [medium] description が多くの記事で未設定
- **現状**: content/config.ts で `description` は `optional()`。記事の frontmatter にdescriptionがないものが多い
- **問題**: フォールバックの `'麻雀の戦術・技術について研究するサークル'` が全ページで使い回される
- **修正案**: 各記事に個別の description を設定するか、記事本文から自動抽出する仕組みを追加

#### [low] twitter:site / twitter:creator が未設定
- **修正案**: サイトの X(Twitter) アカウントがあれば `twitter:site` を追加

---

## 2. 構造化データ / JSON-LD（評価: F）

### 問題点

#### [critical] JSON-LD 構造化データが一切存在しない
サイト全体で schema.org の JSON-LD マークアップが一つも実装されていない。これは Google のリッチリザルト表示に直接影響する。

**必須で追加すべき構造化データ:**

1. **WebSite スキーマ**（トップページ）
   - サイト名、URL、検索アクション

2. **Article スキーマ**（各ブログ記事）
   - headline, datePublished, dateModified, author, image, description
   - Google ニュースやリッチリザルトの表示に必須

3. **BreadcrumbList スキーマ**（全ページ）
   - 現在 Breadcrumb コンポーネントは存在するが、JSON-LD マークアップがない
   - Google 検索結果にパンくずリストが表示されない

4. **Organization スキーマ**（トップページ）
   - 団体名、ロゴ、URL

5. **BlogPosting / ItemList**（記事一覧ページ）
   - 記事リストの構造化データ

---

## 3. テクニカルSEO（評価: C）

### 良い点
- 全ページが静的プリレンダリング（`output: 'static'`）
- CSS/JS のミニファイが有効（`astro.config.mjs:39-42`）
- キャッシュヘッダーが適切に設定（`_headers`）
- セキュリティヘッダーが設定（X-Content-Type-Options, X-Frame-Options 等）
- R2 ドメインへの preconnect が設定（`BaseLayout.astro:47-48`）

### 問題点

#### [critical] robots.txt が存在しない
- **現状**: `public/robots.txt` が存在しない
- **問題**: クローラーに対する明示的なガイダンスがない。sitemap の場所も通知できない
- **修正案**:
  ```
  User-agent: *
  Allow: /
  Sitemap: https://modern-jan.com/sitemap-index.xml
  ```

#### [critical] レガシーリダイレクトが 302（一時的）のまま
- **現状**: `_redirects` と `[...legacyPath].astro` で全て **302** リダイレクト
- **問題**: WordPress からの移行は恒久的なので **301** にすべき。302 では SEO 評価が旧 URL に残り続ける
- **修正案**: `_redirects` のステータスコードを `301` に変更、`[...legacyPath].astro:36` も `301` に変更

#### [high] ページネーションが未実装
- **現状**: 記事一覧（`/blog/`）は全記事を1ページに表示
- **問題**: 記事数が増えるとページが重くなり、クロール効率が低下
- **修正案**: Astro の `paginate()` 機能を使ってページネーションを実装

#### [medium] trailing slash の設定が未明示
- **現状**: `astro.config.mjs` に `trailingSlash` の設定がない
- **問題**: `/blog/slug` と `/blog/slug/` が別URLとして扱われる可能性
- **修正案**: `trailingSlash: 'always'` を設定して統一

#### [medium] Service Worker が SEO に悪影響の可能性
- **現状**: `BaseLayout.astro:51-63` で Service Worker を登録
- **問題**: SW の実装次第でクローラーに古いキャッシュを返す可能性がある
- **確認事項**: `public/sw.js` の実装を確認し、クローラー対応を検証

---

## 4. コンテンツ & 見出し構造（評価: B）

### 良い点
- 各ページに適切な `<h1>` が1つ設定されている
- PostLayout の見出し階層（H1→H2→H3→H4）が適切にスタイリングされている
- 目次（TableOfContents）が H2/H3 から自動生成されている
- 日付に `<time datetime>` 属性が使用されている（`PostLayout.astro:56`）
- `rehype-slug` + `rehype-autolink-headings` で見出しにアンカーリンクが自動付与

### 問題点

#### [high] 記事の description が optional で未設定のケースが多い
- frontmatter に `description` フィールドが存在しない記事がある
- 検索結果のスニペットが意図しない内容になる

#### [medium] 著者情報が存在しない
- **現状**: content/config.ts に `author` フィールドがない
- **問題**: E-E-A-T（経験・専門性・権威性・信頼性）の観点で著者の明示は重要
- **修正案**: frontmatter に author フィールドを追加、記事ページに著者プロフィールを表示

#### [medium] 更新日（updatedAt）が設定されている記事が少ない可能性
- content/config.ts では `updatedAt` が optional
- 最終更新日はコンテンツの鮮度を示す重要なシグナル

#### [low] 読了時間・文字数の表示がない
- ユーザー体験の向上とエンゲージメント指標の改善に有効

---

## 5. クローラビリティ & インデックス（評価: D）

### 良い点
- `@astrojs/sitemap` が導入されている（`astro.config.mjs:25`）
- サイトマップへの `<link>` が設定（`BaseLayout.astro:44`）
- 全ページが SSG でプリレンダリング

### 問題点

#### [critical] robots.txt が存在しない（再掲）
- sitemap の URL をクローラーに通知できない

#### [critical] RSS/Atom フィードが存在しない
- **現状**: RSS フィード生成ページが見つからない
- **問題**: フィードリーダーや各種アグリゲーターからの流入を逃している。Google Discover への露出にも影響
- **修正案**: `@astrojs/rss` パッケージを使って `/rss.xml` を生成

#### [high] sitemap に lastmod が含まれていない可能性
- `astro.config.mjs` で `sitemap()` にオプションが渡されていない
- `lastmod` を設定すべき

#### [high] パンくずリストに JSON-LD がない（再掲）
- Breadcrumb コンポーネントは HTML として存在するが、構造化データがない

#### [medium] 404 ページが Astro で未作成
- **現状**: `src/pages/404.astro` が存在しない
- **問題**: Cloudflare Workers のデフォルト 404 が返される
- **修正案**: カスタム 404 ページを作成し、関連記事や検索機能を提供

---

## 6. AIO - AI最適化（評価: F）

### 問題点

#### [critical] llms.txt が存在しない
- **現状**: `public/llms.txt` が存在しない
- **問題**: AI クローラー（ChatGPT, Claude, Perplexity等）にサイトのコンテンツを効率的に伝えられない
- **修正案**: `public/llms.txt` を作成し、サイトの概要、主要コンテンツ、著者情報を記載

#### [critical] AI クローラーへの対応が未設定
- **現状**: robots.txt 自体が存在しないため、AI クローラー（GPTBot, ChatGPT-User, Claude-Web, PerplexityBot, Google-Extended 等）への指示がない
- **修正案**: robots.txt で AI クローラーの許可/拒否を明示的に設定

#### [critical] 構造化データの欠如（再掲）
- AI システムはJSON-LDを主要なデータソースとして利用する
- Article, FAQPage, HowTo などのスキーマは AI による引用の精度を高める

#### [high] コンテンツの属性情報が不足
- **著者情報**: 記事に誰が書いたかが明記されていない
- **出典・参考文献**: AI が信頼性を判断するための情報が不足
- **修正案**: 著者プロフィール、資格情報、経歴を明示

#### [high] FAQ 構造化データの未活用
- 麻雀の解説記事にはQ&A形式のコンテンツが含まれている可能性がある
- FAQPage スキーマでマークアップすれば、Google AI Overview に表示されやすくなる

#### [medium] セマンティック HTML の改善余地
- **現状**: `<article>`, `<nav>`, `<main>`, `<header>`, `<footer>`, `<time>`, `<aside>` は概ね適切に使われている
- **改善**: `<section>` に `aria-labelledby` を追加、`<address>` 要素で著者連絡先を追記

#### [medium] Speakable スキーマの未実装
- 音声検索やスマートスピーカーからの利用に対応できない
- 主要な記事の要約部分に speakable マークアップを追加

---

## 7. 画像 & メディア最適化（評価: C）

### 良い点
- R2 に AVIF 変換してアップロードする仕組みがある
- 画像に `loading="lazy"` と `decoding="async"` が設定されている（`PostCard.astro:29-30`, `LinkCard.astro:85-86`）
- OGP 画像が自動生成される仕組みがある
- remarkImageSize プラグインで画像サイズプリセットが使える

### 問題点

#### [high] 画像に width/height 属性が設定されていない
- **現状**: `PostCard.astro:26-30` の `<img>` に CSS で寸法は指定しているが、HTML の width/height 属性がない
- **問題**: CLS（Cumulative Layout Shift）の原因になる。Core Web Vitals に悪影響
- **修正案**: `<img>` タグに `width` と `height` 属性を明示的に追加

#### [high] レスポンシブ画像（srcset/sizes）が未実装
- **現状**: 全てのデバイスで同じサイズの画像を配信
- **問題**: モバイルで不要に大きい画像をダウンロードする
- **修正案**: Astro の `<Image>` コンポーネントや `srcset` 属性を活用

#### [medium] 画像サイトマップが未設定
- R2 上の画像が検索エンジンの画像検索にインデックスされにくい

#### [medium] MDX 内の画像の alt テキストにサイズプリセットが混入する可能性
- `remarkImageSize` プラグインが alt テキストから `small:` 等を除去するが、適切に処理されているか要確認

#### [low] favicon が SVG のみ
- **現状**: `public/favicon.svg` のみ
- **問題**: Apple Touch Icon、`manifest.json`、`favicon.ico`（レガシー対応）がない
- **修正案**: 各種サイズのアイコンを生成し、`<link rel="apple-touch-icon">` 等を追加

---

## 8. アクセシビリティ & UX シグナル（評価: C）

### 良い点
- パンくずリストに `aria-label="パンくずリスト"` が設定（`Breadcrumb.astro:9`）
- ハンバーガーメニューに `aria-label="メニューを開く"` が設定（`Header.astro:19`）
- ソーシャルシェアボタンに `aria-label` が設定（`SocialShare.astro`）
- 外部リンクに `rel="noopener noreferrer"` が適切に設定
- WCAG AA 基準のコントラスト比を意識した色設定（`global.css:16-17`）
- モバイル対応のレスポンシブデザインが実装済み

### 問題点

#### [high] スキップナビゲーションリンクがない
- **現状**: "Skip to content" リンクが存在しない
- **問題**: スクリーンリーダーやキーボードユーザーのナビゲーションが不便
- **修正案**: `<body>` 直後に `<a href="#main-content" class="skip-link">コンテンツへスキップ</a>` を追加

#### [high] main 要素に id がない
- **現状**: `<main>` に `id` 属性がない
- **問題**: スキップリンクのターゲットが設定できない
- **修正案**: `<main id="main-content">` を設定

#### [medium] フォーカスインジケーターのカスタマイズがない
- **現状**: ブラウザデフォルトの `:focus` スタイルに依存
- **修正案**: `:focus-visible` を使った明確なフォーカスインジケーターを追加

#### [medium] ハンバーガーメニューの ARIA 状態管理が不完全
- **現状**: `aria-expanded` 属性がトグルボタンに設定されていない
- **修正案**: JS で `aria-expanded="true/false"` をトグル

#### [low] テーブルにキャプション・スコープが未設定
- 記事内のテーブルに `<caption>` や `scope` 属性がない（Markdown 生成のため制限あり）

---

## 9. 日本語SEO（評価: B）

### 良い点
- `<html lang="ja">` が正しく設定（`BaseLayout.astro:22`）
- `<meta charset="UTF-8">` が設定（`BaseLayout.astro:24`）
- URL が ASCII スラグを使用（日本語 URL を避けている）
- 日本語フォントスタックが適切に設定（`global.css:51-52`）
- はてなブックマークのシェアボタンが設置（日本市場向け）
- 日付表示が日本語形式（`2022年4月13日`）
- OGP 画像で Noto Sans JP が使用されている

### 問題点

#### [medium] 日本語 Web フォントの読み込み最適化
- **現状**: system font stack を使用（Web フォントなし）
- **問題**: OS によってフォントが異なり、デザインの一貫性が低下
- **検討**: Web フォント導入の場合は `font-display: swap` と subsetting が必須

#### [medium] サイト内検索がない
- **現状**: 検索機能が存在しない
- **問題**: 日本語コンテンツの発見性が低下
- **修正案**: Pagefind や Algolia 等の検索機能を導入

#### [low] hreflang の未設定
- 日本語のみのサイトなので必須ではないが、多言語展開時は必要
- 英語コンテンツ（`luckyj_article_ja`）がある場合は検討すべき

#### [low] Yahoo! JAPAN / Bing 向けの最適化
- Yahoo! JAPAN は Google のエンジンを使用しているため、Google 対策で十分
- Bing 向けの `<meta name="msvalidate.01">` は必要に応じて設定

---

## 優先度別アクションリスト

### 今すぐ対応すべき（Critical）

1. **robots.txt を作成する**
   - `public/robots.txt` を作成し、Sitemap URL を記載
   - AI クローラーへの対応方針も記載

2. **レガシーリダイレクトを 301 に変更**
   - `_redirects` のステータスコードを `302` → `301` に変更
   - `[...legacyPath].astro:36` も `301` に変更

3. **JSON-LD 構造化データを追加**
   - まず Article スキーマと BreadcrumbList スキーマから対応
   - WebSite, Organization スキーマも追加

4. **canonical URL を追加**
   - `BaseLayout.astro` の `<head>` に `<link rel="canonical">` を追加

5. **llms.txt を作成**
   - サイトの概要と主要コンテンツを AI 向けに記述

### 早期に対応すべき（High）

6. **RSS フィードを追加**
   - `@astrojs/rss` を導入して `/rss.xml` を生成

7. **og:type を記事ページで `article` に変更**
   - article:published_time, article:tag も追加

8. **画像に width/height を追加**
   - PostCard, LinkCard の `<img>` タグに追加

9. **各記事に description を追加**
   - フロントマターに必須化するか、自動生成する仕組みを導入

10. **著者情報を追加**
    - content/config.ts に author フィールドを追加

11. **カスタム 404 ページを作成**

12. **スキップナビゲーションを追加**

### 中期的に対応すべき（Medium）

13. trailing slash の設定を統一
14. sitemap に lastmod を設定
15. ページネーションの実装
16. フォーカスインジケーターの改善
17. aria-expanded の追加（ハンバーガーメニュー）
18. レスポンシブ画像（srcset）の導入
19. サイト内検索の導入
20. Speakable スキーマの追加
21. FAQ スキーマの活用

### 長期的に対応（Low）

22. favicon のマルチフォーマット対応
23. Web フォントの検討
24. 読了時間の表示
25. 画像サイトマップの追加
26. twitter:site の設定

---

## 補足: AIO 対応の重要性

2025年以降、Google AI Overview や ChatGPT、Perplexity などの AI 検索エンジンのシェアが急速に拡大しています。従来の SEO に加えて、以下の AIO 対策が重要になっています:

1. **構造化データ**: AI がコンテンツを正確に理解するための基盤
2. **llms.txt**: AI クローラーに対するサイトの自己紹介ファイル
3. **明確なコンテンツ構造**: 見出し、リスト、表の活用
4. **著者・権威性の明示**: E-E-A-T シグナルの強化
5. **FAQ/HowTo マークアップ**: AI が回答に引用しやすい形式
6. **コンテンツの鮮度**: 更新日の明示と定期的な更新

麻雀の戦術・技術に関するニッチな専門性は、AI システムにとって引用価値の高いコンテンツです。適切な構造化データと AIO 対策を行うことで、AI 検索からの流入を大幅に増やすことが期待できます。
