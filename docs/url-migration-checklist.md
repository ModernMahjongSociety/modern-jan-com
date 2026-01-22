# URL移行チェックリスト

移行元サイト（https://modern-jan.com/）から現行サイトへのURL移行状況を確認するためのチェックリストです。

## テスト方法

### 方法1: GitHub Actionsで実行

以下のワークフローファイルを `.github/workflows/url-migration-test.yml` として追加してください:

```yaml
name: URL Migration Test

on:
  workflow_dispatch:
    inputs:
      base_url:
        description: 'Base URL to test (e.g., https://modern-jan-com.ken0421wabu.workers.dev)'
        required: true
        default: 'https://modern-jan-com.ken0421wabu.workers.dev'
  push:
    branches:
      - main
    paths:
      - 'scripts/url-migration-test.ts'
      - '.github/workflows/url-migration-test.yml'

jobs:
  test-urls:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run URL migration test
        run: npx tsx scripts/url-migration-test.ts ${{ github.event.inputs.base_url || 'https://modern-jan-com.ken0421wabu.workers.dev' }}
        continue-on-error: true

      - name: Generate test report
        if: always()
        run: |
          echo "## URL Migration Test Report" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Base URL: \`${{ github.event.inputs.base_url || 'https://modern-jan-com.ken0421wabu.workers.dev' }}\`" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "See job logs for detailed results." >> $GITHUB_STEP_SUMMARY
```

ワークフロー追加後:
1. GitHubリポジトリの「Actions」タブを開く
2. 「URL Migration Test」ワークフローを選択
3. 「Run workflow」をクリック
4. Base URLを入力して実行

### 方法2: ブラウザコンソールで実行
1. 現行サイト（https://modern-jan-com.ken0421wabu.workers.dev/）を開く
2. 開発者ツール（F12）を開く
3. コンソールタブに移動
4. `scripts/url-migration-test-browser.js` の内容をコピー&ペーストして実行

### 方法3: ローカルで実行
```bash
npx tsx scripts/url-migration-test.ts [BASE_URL]
```

---

## URL一覧

### 静的ページ（17ページ）

| パス | ページ名 | ステータス |
|------|---------|-----------|
| `/` | トップページ | |
| `/about` | モダジャン研究会について | |
| `/blog` | ブログ一覧 | |
| `/books` | 書籍紹介 | |
| `/kansen` | 大会観戦 | |
| `/mahjong-introduction` | 麻雀入門 | |
| `/member` | メンバー紹介 | |
| `/news` | ニュース | |
| `/privacy` | プライバシーポリシー | |
| `/recommended-books` | おすすめ書籍 | |
| `/rule` | ルール | |
| `/tutorial` | チュートリアル | |
| `/title` | タイトル戦一覧 | |
| `/title/jantama` | 雀魂タイトル戦 | |
| `/title/2021batakacup` | 2021バタカップ | |
| `/title/syakuousen` | 雀王戦一覧 | |
| `/title/syakuousen/syakuou1st` | 第1期雀王戦 | |

### ブログ記事 - 新URL（14記事）

| パス | 記事名 | ステータス |
|------|--------|-----------|
| `/blog/hello-world/` | HP発足のお知らせ | |
| `/blog/2021report/` | 2021年度活動報告 | |
| `/blog/haikouritsu/` | 牌効率講座 | |
| `/blog/luckyj_vs_naga_and_suphx/` | LuckyJ vs NAGA/Suphx | |
| `/blog/luckyj_article_ja/` | LuckyJ記事 | |
| `/blog/middle_haikouritsu/` | 中級牌効率 | |
| `/blog/movie-beginner/` | 初心者向け動画 | |
| `/blog/mjrs/` | MJRS紹介 | |
| `/blog/newreague/` | 新リーグ | |
| `/blog/shakureport1-1/` | 雀王レポート1-1 | |
| `/blog/shakureport1-3/` | 雀王レポート1-3 | |
| `/blog/syakuou-1-result/` | 第1期雀王戦結果 | |
| `/blog/syakureport1-8/` | 雀王レポート1-8 | |
| `/blog/circle-participation-chi-kan-pon-nya/` | チー、カン、ポンにゃ！ | |

### レガシーURL - 301リダイレクト対象（14URL）

旧URLからのアクセスは新URLへ301リダイレクトされる必要があります。

| 旧パス（移行元） | リダイレクト先（新URL） | ステータス |
|------------------|------------------------|-----------|
| `/2021/10/06/hello-world` | `/blog/hello-world/` | |
| `/2021/10/06/newreague` | `/blog/newreague/` | |
| `/2021/10/07/shakureport1-1` | `/blog/shakureport1-1/` | |
| `/2021/10/13/shakureport1-3` | `/blog/shakureport1-3/` | |
| `/2021/10/23/syakureport1-8` | `/blog/syakureport1-8/` | |
| `/2021/10/27/movie-beginner` | `/blog/movie-beginner/` | |
| `/2021/10/28/syakuou-1-result` | `/blog/syakuou-1-result/` | |
| `/2022/04/13/haikouritsu` | `/blog/haikouritsu/` | |
| `/2022/07/16/2021report` | `/blog/2021report/` | |
| `/2022/07/19/mjrs` | `/blog/mjrs/` | |
| `/2023/09/05/middle_haikouritsu` | `/blog/middle_haikouritsu/` | |
| `/2023/09/06/luckyj_article_ja` | `/blog/luckyj_article_ja/` | |
| `/2023/09/06/luckyj_vs_naga_and_suphx` | `/blog/luckyj_vs_naga_and_suphx/` | |
| `/2024/09/23/%e3%83%81%e3%83%bc...（チー、カン、ポン...）` | `/blog/circle-participation-chi-kan-pon-nya/` | |

### タグページ（6ページ）

| パス | タグ名 | ステータス |
|------|--------|-----------|
| `/tag/おすすめ` | おすすめ | |
| `/tag/初心者` | 初心者 | |
| `/tag/動画` | 動画 | |
| `/tag/AI` | AI | |
| `/tag/麻雀` | 麻雀 | |
| `/tag/雀魂` | 雀魂 | |

---

## 合計

- 静的ページ: 17
- ブログ記事（新URL）: 14
- レガシーURL（リダイレクト）: 14
- タグページ: 6
- **総計: 51 URL**
