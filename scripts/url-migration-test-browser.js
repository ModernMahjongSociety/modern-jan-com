/**
 * ブラウザコンソール用 URL移行テストスクリプト
 *
 * 使用方法:
 * 1. ブラウザで https://modern-jan-com.ken0421wabu.workers.dev/ を開く
 * 2. 開発者ツール（F12）を開く
 * 3. コンソールタブに移動
 * 4. このスクリプト全体をコピー&ペーストして実行
 */

(async function runUrlMigrationTest() {
  const BASE_URL = location.origin; // 現在のサイトをベースにテスト

  const results = [];

  // 静的ページURL一覧
  const staticPages = [
    { path: "/", name: "トップページ" },
    { path: "/about", name: "モダジャン研究会について" },
    { path: "/blog", name: "ブログ一覧" },
    { path: "/books", name: "書籍紹介" },
    { path: "/kansen", name: "大会観戦" },
    { path: "/mahjong-introduction", name: "麻雀入門" },
    { path: "/member", name: "メンバー紹介" },
    { path: "/news", name: "ニュース" },
    { path: "/privacy", name: "プライバシーポリシー" },
    { path: "/recommended-books", name: "おすすめ書籍" },
    { path: "/rule", name: "ルール" },
    { path: "/tutorial", name: "チュートリアル" },
    { path: "/title", name: "タイトル戦一覧" },
    { path: "/title/jantama", name: "雀魂タイトル戦" },
    { path: "/title/2021batakacup", name: "2021バタカップ" },
    { path: "/title/syakuousen", name: "雀王戦一覧" },
    { path: "/title/syakuousen/syakuou1st", name: "第1期雀王戦" },
  ];

  // ブログ記事の新しいURL（/blog/[slug]/形式）
  const blogNewUrls = [
    { path: "/blog/hello-world/", name: "HP発足のお知らせ" },
    { path: "/blog/2021report/", name: "2021年度活動報告" },
    { path: "/blog/haikouritsu/", name: "牌効率講座" },
    { path: "/blog/luckyj_vs_naga_and_suphx/", name: "LuckyJ vs NAGA/Suphx" },
    { path: "/blog/luckyj_article_ja/", name: "LuckyJ記事" },
    { path: "/blog/middle_haikouritsu/", name: "中級牌効率" },
    { path: "/blog/movie-beginner/", name: "初心者向け動画" },
    { path: "/blog/mjrs/", name: "MJRS紹介" },
    { path: "/blog/newreague/", name: "新リーグ" },
    { path: "/blog/shakureport1-1/", name: "雀王レポート1-1" },
    { path: "/blog/shakureport1-3/", name: "雀王レポート1-3" },
    { path: "/blog/syakuou-1-result/", name: "第1期雀王戦結果" },
    { path: "/blog/syakureport1-8/", name: "雀王レポート1-8" },
    { path: "/blog/circle-participation-chi-kan-pon-nya/", name: "チー、カン、ポンにゃ！サークル参加" },
  ];

  // 移行元サイトのレガシーURL（/yyyy/mm/dd/slug形式）- 301リダイレクトが期待される
  const legacyUrls = [
    { path: "/2021/10/06/hello-world", name: "【レガシー】HP発足のお知らせ", expectedRedirect: "/blog/hello-world/" },
    { path: "/2021/10/06/newreague", name: "【レガシー】新リーグ", expectedRedirect: "/blog/newreague/" },
    { path: "/2021/10/07/shakureport1-1", name: "【レガシー】雀王レポート1-1", expectedRedirect: "/blog/shakureport1-1/" },
    { path: "/2021/10/13/shakureport1-3", name: "【レガシー】雀王レポート1-3", expectedRedirect: "/blog/shakureport1-3/" },
    { path: "/2021/10/23/syakureport1-8", name: "【レガシー】雀王レポート1-8", expectedRedirect: "/blog/syakureport1-8/" },
    { path: "/2021/10/27/movie-beginner", name: "【レガシー】初心者向け動画", expectedRedirect: "/blog/movie-beginner/" },
    { path: "/2021/10/28/syakuou-1-result", name: "【レガシー】第1期雀王戦結果", expectedRedirect: "/blog/syakuou-1-result/" },
    { path: "/2022/04/13/haikouritsu", name: "【レガシー】牌効率講座", expectedRedirect: "/blog/haikouritsu/" },
    { path: "/2022/07/16/2021report", name: "【レガシー】2021年度活動報告", expectedRedirect: "/blog/2021report/" },
    { path: "/2022/07/19/mjrs", name: "【レガシー】MJRS紹介", expectedRedirect: "/blog/mjrs/" },
    { path: "/2023/09/05/middle_haikouritsu", name: "【レガシー】中級牌効率", expectedRedirect: "/blog/middle_haikouritsu/" },
    { path: "/2023/09/06/luckyj_article_ja", name: "【レガシー】LuckyJ記事", expectedRedirect: "/blog/luckyj_article_ja/" },
    { path: "/2023/09/06/luckyj_vs_naga_and_suphx", name: "【レガシー】LuckyJ vs NAGA/Suphx", expectedRedirect: "/blog/luckyj_vs_naga_and_suphx/" },
    {
      path: "/2024/09/23/%e3%83%81%e3%83%bc%e3%80%81%e3%82%ab%e3%83%b3%e3%80%81%e3%83%9d%e3%83%b3%e3%81%ab%e3%82%83%ef%bc%81%e4%ba%8c%e6%9c%ac%e5%a0%b4%e3%81%ab%e3%82%b5%e3%83%bc%e3%82%af%e3%83%ab%e5%8f%82%e5%8a%a0%e3%81%97",
      name: "【レガシー】チー、カン、ポンにゃ（URL encoded）",
      expectedRedirect: "/blog/circle-participation-chi-kan-pon-nya/"
    },
  ];

  // タグページ
  const tagPages = [
    { path: "/tag/おすすめ", name: "タグ: おすすめ" },
    { path: "/tag/初心者", name: "タグ: 初心者" },
    { path: "/tag/動画", name: "タグ: 動画" },
    { path: "/tag/AI", name: "タグ: AI" },
    { path: "/tag/麻雀", name: "タグ: 麻雀" },
    { path: "/tag/雀魂", name: "タグ: 雀魂" },
  ];

  async function testUrl(path, category, checkRedirect = false, expectedRedirect = null) {
    const fullUrl = `${BASE_URL}${path}`;
    try {
      const response = await fetch(fullUrl, {
        redirect: checkRedirect ? "manual" : "follow",
      });

      // 301, 302, 307, 308 はすべて有効なリダイレクトステータスコード
      const isRedirect = [301, 302, 307, 308].includes(response.status);

      const result = {
        url: path,
        category,
        status: response.status,
        ok: checkRedirect ? isRedirect : response.ok,
        redirectedTo: null,
        expectedRedirect,
        redirectOk: null,
      };

      if (checkRedirect && isRedirect) {
        result.redirectedTo = response.headers.get("location");
        if (expectedRedirect && result.redirectedTo) {
          result.redirectOk = result.redirectedTo.endsWith(expectedRedirect);
        }
      }

      return result;
    } catch (error) {
      return {
        url: path,
        category,
        status: 0,
        ok: false,
        error: error.message,
      };
    }
  }

  console.log("%c================================================================================", "color: #00ff00; font-weight: bold;");
  console.log("%cURL移行テスト", "color: #00ff00; font-size: 18px; font-weight: bold;");
  console.log(`%cテスト対象: ${BASE_URL}`, "color: #00ff00;");
  console.log("%c================================================================================", "color: #00ff00; font-weight: bold;");

  // 静的ページのテスト
  console.log("%c\n📄 静的ページのテスト...", "color: #ffff00; font-weight: bold;");
  for (const page of staticPages) {
    const result = await testUrl(page.path, "静的ページ");
    results.push(result);
    const icon = result.ok ? "✅" : "❌";
    console.log(`  ${icon} [${result.status}] ${page.path} - ${page.name}`);
  }

  // 新ブログURLのテスト
  console.log("%c\n📝 ブログ記事（新URL）のテスト...", "color: #ffff00; font-weight: bold;");
  for (const page of blogNewUrls) {
    const result = await testUrl(page.path, "ブログ（新URL）");
    results.push(result);
    const icon = result.ok ? "✅" : "❌";
    console.log(`  ${icon} [${result.status}] ${page.path} - ${page.name}`);
  }

  // レガシーURLのリダイレクトテスト
  console.log("%c\n🔄 レガシーURL（リダイレクト）のテスト...", "color: #ffff00; font-weight: bold;");
  for (const page of legacyUrls) {
    const result = await testUrl(page.path, "レガシーURL", true, page.expectedRedirect);
    results.push(result);
    const icon = result.ok ? "✅" : "❌";
    const redirectInfo = result.redirectedTo ? ` -> ${result.redirectedTo}` : "";
    console.log(`  ${icon} [${result.status}] ${page.path}${redirectInfo}`);

    if (result.redirectOk === false) {
      console.log(`     %c⚠️  期待されるリダイレクト先: ${page.expectedRedirect}`, "color: #ff9900;");
    }
  }

  // タグページのテスト
  console.log("%c\n🏷️  タグページのテスト...", "color: #ffff00; font-weight: bold;");
  for (const page of tagPages) {
    const result = await testUrl(encodeURI(page.path), "タグページ");
    results.push(result);
    const icon = result.ok ? "✅" : "❌";
    console.log(`  ${icon} [${result.status}] ${page.path} - ${page.name}`);
  }

  // サマリー
  console.log("%c\n================================================================================", "color: #00ff00; font-weight: bold;");
  console.log("%cテスト結果サマリー", "color: #00ff00; font-size: 16px; font-weight: bold;");
  console.log("%c================================================================================", "color: #00ff00; font-weight: bold;");

  const categories = ["静的ページ", "ブログ（新URL）", "レガシーURL", "タグページ"];

  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.ok).length;
    const total = categoryResults.length;
    const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : "0";
    const color = passed === total ? "color: #00ff00;" : "color: #ff0000;";
    console.log(`%c  ${category}: ${passed}/${total} (${percentage}%)`, color);
  }

  const totalPassed = results.filter(r => r.ok).length;
  const totalTests = results.length;
  const totalPercentage = ((totalPassed / totalTests) * 100).toFixed(1);

  console.log("----------------------------------------");
  const totalColor = totalPassed === totalTests ? "color: #00ff00; font-weight: bold;" : "color: #ff0000; font-weight: bold;";
  console.log(`%c  合計: ${totalPassed}/${totalTests} (${totalPercentage}%)`, totalColor);

  // 失敗したテストの詳細
  const failedTests = results.filter(r => !r.ok);
  if (failedTests.length > 0) {
    console.log("%c\n❌ 失敗したテスト:", "color: #ff0000; font-weight: bold;");
    for (const test of failedTests) {
      console.log(`%c  - [${test.status}] ${test.url} (${test.category})`, "color: #ff0000;");
      if (test.error) {
        console.log(`%c    エラー: ${test.error}`, "color: #ff9900;");
      }
    }
  } else {
    console.log("%c\n🎉 すべてのテストが成功しました！", "color: #00ff00; font-size: 16px; font-weight: bold;");
  }

  // テーブル表示
  console.log("\n%c詳細結果テーブル:", "font-weight: bold;");
  console.table(results.map(r => ({
    URL: r.url,
    カテゴリ: r.category,
    ステータス: r.status,
    結果: r.ok ? "✅ OK" : "❌ NG",
    リダイレクト先: r.redirectedTo || "-",
  })));

  return results;
})();
