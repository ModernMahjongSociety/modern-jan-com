# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the official website for モダンジャン研究会 (Modern Mahjong Society), migrated from WordPress to Astro. The site is deployed to Cloudflare Workers using the `@astrojs/cloudflare` adapter with images stored on Cloudflare R2.

## Development Commands

### Essential Commands

```bash
# Development
bun run dev          # Start dev server at http://localhost:4321

# Build & Preview
bun run build        # Production build (includes link card fetch and OGP generation)
bun run preview      # Preview production build

# Image Management (R2)
bun run extract:images           # Extract referenced images from content
bun run upload:images:dry        # Dry-run image upload
bun run upload:images            # Upload images with AVIF conversion
bun run upload:images:no-convert # Upload images without conversion

# Build Components (run automatically during build)
bun run fetch:linkcards  # Fetch external link metadata
bun run generate:ogp     # Generate OGP images for posts
```

### Environment Setup

Environment variables are managed with dotenvx and encrypted in `.env.keys`. Copy `.env.example` to `.env` and configure:

- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `CLOUDFLARE_API_TOKEN` - For custom domain setup
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` - For image uploads to R2

## Architecture

### Content Collections

The site uses Astro Content Collections with two main types:

**Posts** (`src/content/posts/*.mdx`):
- Blog articles with frontmatter: `title`, `publishedAt`, `tags`, `category`, `image`, `legacySlug`
- `legacySlug` enables WordPress URL redirects via `[...legacyPath].astro` catch-all route
- Redirects are 302 (temporary) and generated in `public/_redirects`

**Pages** (`src/content/pages/*.mdx`):
- Static pages with minimal frontmatter: `title`, `description`

### Key Routing Patterns

1. **Legacy URL Redirection** (`src/pages/[...legacyPath].astro`):
   - Catches old WordPress URLs like `/2022/04/13/haikouritsu/`
   - Matches against `legacySlug` in post frontmatter
   - Redirects to new `/blog/{slug}/` URLs with 302 status
   - Handles both URL-encoded and decoded versions

2. **Blog Posts** (`src/pages/blog/[slug].astro`):
   - Dynamic routes for all posts using `getStaticPaths()`
   - Renders with `PostLayout.astro`

3. **Tag Pages** (`src/pages/tag/[tag].astro`):
   - Lists all posts with a specific tag

### Image Handling

**Image Size Presets** (via `remarkImageSize` plugin):
- MDX images can specify size in alt text: `![small:Description](url)` or `![Description|medium](url)`
- Sizes: `small`, `medium`, `large`
- Plugin converts to `data-size` attribute and cleans alt text
- Images are stored on R2 at `https://r2.modern-jan.com/`

**Cloudflare R2 Integration**:
- Images uploaded via scripts in `scripts/` directory
- Supports AVIF conversion for optimization
- Custom domain: `r2.modern-jan.com`

### Build-Time Generation

**OGP Images** (`scripts/generate-og-images.ts`):
- Generates PNG OGP images for each post at `public/ogp/{slug}.png`
- Uses Satori (React-to-SVG) + Resvg (SVG-to-PNG) + Sharp (optimization)
- Template: blue background (#14274E) with title, first tag, and site name
- Uses Noto Sans JP font for Japanese text support
- Runs automatically during build

**Link Cards** (`scripts/fetch-link-card-metadata.ts`):
- Scrapes external URLs referenced in `<LinkCard url="..." />` components
- Caches metadata in `src/data/link-cards.json` (30-day TTL)
- Uses metascraper to extract title, description, and image
- Rate-limited with 1-second delays between requests
- Runs automatically during build

### Custom Components

**Mahjong Tiles** (`mj-tiles` package v0.2.0):
```astro
import Tile from 'mj-tiles/astro/Tile.astro'
import Tiles from 'mj-tiles/astro/Tiles.astro'
import 'mj-tiles/styles.css'

<Tile tile="8m" />           # Single tile (8 man)
<Tile tile="0m" />           # Red 5 man
<Tile tile="白" />           # White dragon
<Tiles hand="14p" />         # Multiple tiles
```

**LinkCard Component**:
- Automatically fetches metadata for external URLs
- For internal WordPress URLs, resolves via `legacySlug` lookup
- Displays thumbnail, title, description, and domain
- External links open in new tab with `rel="noopener noreferrer"`

**YouTube Embeds**:
```astro
import { YouTube } from '@astro-community/astro-embed-youtube';
<YouTube id="VIDEO_ID" params="start=105" />
```

### MDX Configuration

Configured in `astro.config.mjs` with:
- `remarkImageSize` - Custom plugin for image size presets
- `rehype-slug` - Auto-generates heading IDs
- `rehype-autolink-headings` - Wraps headings in anchor links
- Syntax highlighting: `github-dark` theme

### Build Optimization

**Vite Configuration** (`astro.config.mjs`):
```javascript
vite: {
  build: {
    cssMinify: true,      // CSS minification
    minify: 'esbuild',    // Fast JS minification with esbuild
  },
}
```

**Performance Features**:
- CSS and JavaScript are automatically minified
- Assets are hashed for cache busting (`_astro/*.Bn-K-XIB.css`)
- R2 images are preconnected for faster loading (`<link rel="preconnect">`)

### Deployment

**Target**: Cloudflare Workers
- Framework: Astro with `@astrojs/cloudflare` adapter
- Build command: `bun run build`
- Deploy command: `npx wrangler deploy`
- Output directory: `dist`
- Output mode: `static` (pre-rendered at build time)
- Worker entry point: `dist/_worker.js/index.js`

**Build Process**:
1. Pre-build: Fetch link card metadata + Generate OGP images
2. Astro build: Generate static HTML + Worker bundle
3. Deploy: wrangler deploys Worker to Cloudflare edge

**Output Structure**:
```
dist/
├── _worker.js/          # Cloudflare Worker bundle
│   ├── index.js         # Worker entry point
│   └── ...              # SSR runtime and chunks
├── _routes.json         # Route configuration for Workers
├── _headers             # Cache and security headers
├── _redirects           # Legacy URL redirects (302)
├── *.html               # Pre-rendered pages
└── _astro/              # Static assets (CSS, JS)
```

**Adapter Configuration** (`astro.config.mjs`):
- `output: 'static'` - Pre-renders all pages at build time
- `adapter: cloudflare()` - Generates Worker bundle for edge deployment
- Sitemap exclusions: `/sitemap.xml`, `/sitemap-*.xml`

**Performance Optimizations**:
- CSS/JS minification via esbuild
- Long-term caching for static assets (1 year via `_headers`)
- HTML caching with revalidation (1 hour)
- Preconnect to R2 domain for faster image loading
- Security headers: X-Content-Type-Options, X-Frame-Options, etc.

## File Structure Highlights

```
src/
├── content/
│   ├── config.ts           # Content Collections schema
│   ├── posts/*.mdx         # Blog posts
│   └── pages/*.mdx         # Static pages
├── pages/
│   ├── [...]legacyPath].astro  # Legacy URL redirects
│   ├── blog/[slug].astro   # Blog post pages
│   └── tag/[tag].astro     # Tag archive pages
├── layouts/
│   ├── BaseLayout.astro    # Base HTML structure
│   ├── PageLayout.astro    # Static page layout
│   └── PostLayout.astro    # Blog post layout
├── components/
│   ├── LinkCard.astro      # External/internal link cards
│   └── ...                 # Header, Footer, Sidebar, etc.
└── lib/
    └── remark-image-size.ts  # Custom remark plugin

scripts/
├── generate-og-images.ts      # OGP image generation
├── fetch-link-card-metadata.ts # Link metadata scraping
├── optimize-and-upload-images.ts # R2 image upload
└── ...                        # Other migration/utility scripts

public/
├── _headers                # Cache & security headers for Cloudflare
├── _redirects              # Cloudflare redirects (302)
└── ogp/*.png              # Generated OGP images

dist/ (generated by build)
├── _worker.js/             # Cloudflare Worker runtime
├── _routes.json            # Worker routing configuration
├── _headers                # Cache headers (copied from public/)
└── _redirects              # Redirects (copied from public/)
```

## Important Notes

- Use Bun as the package manager and runtime (managed via mise)
- All blog post URLs follow `/blog/{slug}/` pattern
- Legacy WordPress URLs redirect through catch-all route
- Build process requires Node.js 20.x for Astro compatibility
- Images should be uploaded to R2 before referencing in content
- Link card metadata is cached and only refetched after 30 days
- OGP images are regenerated on every build

### Cloudflare Workers Deployment

- **Static Pre-rendering**: All pages are pre-rendered at build time (`output: 'static'`)
- **Edge Deployment**: Worker runs on Cloudflare's global edge network
- **No Runtime Rendering**: Pages are served as static files, not dynamically rendered
- **Cache Strategy**:
  - Static assets (`/_astro/*`, `/ogp/*`): 1 year immutable cache
  - HTML pages: 1 hour cache with revalidation
- **Security**: Headers configured via `public/_headers`
- **Wrangler**: Deployment managed through `wrangler` CLI (v4.60.0)
