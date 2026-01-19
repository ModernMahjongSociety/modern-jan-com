import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Content Collectionsを直接使えないため、MDXファイルから frontmatter を読み取る
interface PostMeta {
  slug: string;
  title: string;
  tags: string[];
}

async function extractPostMeta(): Promise<PostMeta[]> {
  const postsDir = join(process.cwd(), 'src/content/posts');
  const files = await readdir(postsDir);
  const mdxFiles = files.filter(f => f.endsWith('.mdx'));

  const posts: PostMeta[] = [];

  for (const file of mdxFiles) {
    const content = readFileSync(join(postsDir, file), 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const titleMatch = frontmatter.match(/title:\s*["'](.+?)["']/);
      const tagsMatch = frontmatter.match(/tags:\s*\[(.+?)\]/);

      if (titleMatch) {
        const title = titleMatch[1];
        const tags = tagsMatch
          ? tagsMatch[1].split(',').map(t => t.trim().replace(/["']/g, ''))
          : [];
        const slug = file.replace('.mdx', '');

        posts.push({ slug, title, tags });
      }
    }
  }

  return posts;
}

function generateOGTemplate(title: string, tag: string): React.ReactElement {
  return {
    type: 'div',
    props: {
      style: {
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#14274E',
        padding: '80px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 72,
                    fontWeight: 700,
                    color: 'white',
                    textAlign: 'center',
                    marginBottom: 40,
                    lineHeight: 1.2,
                    maxWidth: 1040,
                  },
                  children: title,
                },
              },
              tag && {
                type: 'div',
                props: {
                  style: {
                    fontSize: 32,
                    color: '#94a3b8',
                    marginBottom: 60,
                  },
                  children: `#${tag}`,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 28,
                    color: '#cbd5e1',
                    fontWeight: 600,
                  },
                  children: 'モダンジャン研究会',
                },
              },
            ].filter(Boolean),
          },
        },
      ],
    },
  } as unknown as React.ReactElement;
}

async function generateOGImage(post: PostMeta): Promise<Buffer> {
  // Noto Sans JP フォントファイルを読み込み（完全な日本語セット）
  const fontPath = join(
    process.cwd(),
    'node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff'
  );
  const fontData = readFileSync(fontPath);

  const svg = await satori(
    generateOGTemplate(post.title, post.tags[0] || ''),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Noto Sans JP',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  );

  // SVG → PNG 変換
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1200,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // sharp で最適化
  const optimized = await sharp(pngBuffer)
    .png({ quality: 90, compressionLevel: 9 })
    .toBuffer();

  return optimized;
}

async function main() {
  console.log('🎨 OGP画像生成を開始します...');

  // public/ogp/ ディレクトリ作成
  const ogpDir = join(process.cwd(), 'public/ogp');
  await mkdir(ogpDir, { recursive: true });

  // 記事メタデータ取得
  const posts = await extractPostMeta();
  console.log(`📝 ${posts.length}件の記事を検出しました`);

  // 各記事のOGP画像生成
  for (const post of posts) {
    try {
      const imageBuffer = await generateOGImage(post);
      const outputPath = join(ogpDir, `${post.slug}.png`);
      await writeFile(outputPath, imageBuffer);
      console.log(`✅ 生成完了: ${post.slug}.png`);
    } catch (error) {
      console.error(`❌ エラー: ${post.slug}`, error);
    }
  }

  // デフォルトOGP画像も生成
  try {
    const defaultPost: PostMeta = {
      slug: 'default',
      title: 'モダンジャン研究会',
      tags: ['麻雀研究'],
    };
    const imageBuffer = await generateOGImage(defaultPost);
    const outputPath = join(ogpDir, 'default.png');
    await writeFile(outputPath, imageBuffer);
    console.log('✅ デフォルトOGP画像生成完了: default.png');
  } catch (error) {
    console.error('❌ デフォルトOGP画像生成エラー', error);
  }

  console.log('🎉 OGP画像生成が完了しました！');
}

main().catch(console.error);
