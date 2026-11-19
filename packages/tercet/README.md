# tercet

A small, fast, secure Next.js framework for publishing poems. Typography first, nothing else in the way.

- **Readable**: verse-aware layout (stanzas, hanging indents), light and dark themes, print styles.
- **Accessible**: WCAG AA contrast, keyboard shortcuts, skip link, screen reader labels and live regions, reduced motion, forced colours.
- **Fast**: every page is prerendered and refreshed in the background (ISR). Search runs in the browser and needs no server.
- **Pluggable**: storage backends, file formats and languages are interfaces with one module per implementation.
- **Locked down**: no runtime dependencies beyond Next.js and React (the S3 client is optional), strict security headers, no code execution from content, publishing off by default.

Example: [examples/minimal](../../examples/minimal) (English, disk storage, custom theme, no S3).

Requires Next.js 16, React 19.3 and Node 22.18+.

## A site in ten small files

```bash
npm install @cantoramann/tercet
```

A site is a Next.js app whose route files each re-export one piece of the framework.

```ts
// tercet.ts
import { createTercet, defineConfig } from "@cantoramann/tercet";

export const config = defineConfig({
  title: "Night Notes",
  tagline: ["Things written after midnight."],
  locale: "en",
  siteUrl: "https://example.com",
});

export const tercet = createTercet(config);
```

```ts
// next.config.ts
import { withTercet } from "@cantoramann/tercet/next";
export default withTercet();
```

```tsx
// app/layout.tsx
import { EB_Garamond } from "next/font/google";
import { tercet } from "@/tercet";

const font = EB_Garamond({ variable: "--tercet-font", subsets: ["latin"], style: ["normal", "italic"] });
const { Layout, metadata, viewport } = tercet.layout;
export { metadata, viewport };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <Layout className={font.variable}>{children}</Layout>;
}
```

```ts
// app/page.tsx
import { tercet } from "@/tercet";
export const revalidate = 600;
export default tercet.home.Page;

// app/poems/[slug]/page.tsx
import { tercet } from "@/tercet";
export const revalidate = 600;
export const dynamicParams = true;
export const { generateStaticParams, generateMetadata } = tercet.poem;
export default tercet.poem.Page;

// app/write/page.tsx
import { tercet } from "@/tercet";
export const { metadata } = tercet.write;
export default tercet.write.Page;

// app/not-found.tsx
import { tercet } from "@/tercet";
export default tercet.notFound.Page;

// app/sitemap.ts
import { tercet } from "@/tercet";
export const revalidate = 600;
export default tercet.sitemap;

// app/robots.ts
import { tercet } from "@/tercet";
export default tercet.robots;

// app/api/poems/route.ts
import { tercet } from "@/tercet";
export const { GET, POST } = tercet.api.poems;
```

Next.js requires segment options such as `revalidate` to be literals in each route file, so they cannot come from the framework. Keep them equal to `config.revalidate`.

Leave out any route you don't want (`/write`, the API). Add your own pages next to them; `tercet.data.listPoems()` gives you the cached collection.

## Config

| Option | Default | |
| --- | --- | --- |
| `title` | required | site name |
| `description` | `""` | meta description |
| `tagline` | `[]` | lines under the title on the home page |
| `locale` | `"en"` | BCP 47 tag; built-in dictionaries: `tr`, `en` |
| `messages` | built-in | override any UI string, or pass a full dictionary for another language |
| `siteUrl` | `NEXT_PUBLIC_SITE_URL` | canonical URLs, sitemap, social cards |
| `revalidate` | `600` | seconds the poem list is cached |
| `storage` | from env | `fs()`, `s3({ … })` or any `BlobStore` (see [Storage](#storage)) |
| `codec` | frontmatter | any `PoemCodec`, for another file format |
| `theme` | warm paper | colours for light and dark mode, and the fallback font (see [Look](#look)) |

```ts
messages: {
  back: "home",
  search: { found: { one: "{n} match", other: "{n} matches" } },
}
```

Count messages use the language's plural rules (`Intl.PluralRules`).

## Look

Set colours and the font in the config. Leave out anything you want to keep:

```ts
theme: {
  light: { background: "#f7f7f2", text: "#1f2328", muted: "#57606a", highlight: "#fff1a8" },
  dark:  { background: "#0d1117", text: "#e6edf3", muted: "#9da7b3" },
  font: '"Iowan Old Style", Palatino, Georgia, serif',
}
```

| Key | Used for |
| --- | --- |
| `background`, `text` | page and body text; `background` also colours the mobile browser bar |
| `muted` | excerpts, labels, the tagline (keep 4.5:1 contrast with `background`) |
| `faint`, `border` | decorative marks and hairline rules |
| `highlight`, `selection` | search matches and selected text |

Any CSS colour works (hex, `rgb()`, `hsl()`, `oklch()`, names). Values are checked so they can't inject CSS.

**Fonts**: `theme.font` is the font stack. To self-host a web font, use `next/font` with `variable: "--tercet-font"` and pass its class to `<Layout className={…}>`; that takes priority over `theme.font`.

**Plain CSS still works**: the theme is emitted with zero specificity, so a `:root { --bg: …; --fg: … }` rule in your own stylesheet always wins, whatever order the CSS loads in. Spacing and sizing tokens (`--measure`, `--gutter`) are at the top of [`src/styles.css`](src/styles.css).

## next.config

```ts
export default withTercet(nextConfig, {
  contentDir: "poems",                                // the fs folder, set once (default content/poems)
  csp: { "connect-src": ["https://plausible.io"] },   // extra CSP sources
  hsts: { includeSubDomains: true, preload: true },   // opt in; default is this host only
});
```

Your own `nextConfig` settings are kept, and headers from your own `headers()` override tercet's defaults of the same name. The image optimizer always stays off.

HSTS defaults to `max-age=63072000` for the current host only. `includeSubDomains` and `preload` apply to the whole domain and are hard to undo (browsers ship the preload list), so they are opt-in. `hsts: false` leaves the header to your host.

## Content

Poems are `.mdx` (or `.md`) files:

```md
---
title: "Lamplight"
date: "2026-11-01"
---

The kettle keeps its counsel,
the window keeps the rain.
```

Blank lines separate stanzas. The text is shown as written; it is never run as MDX or HTML.

## Storage

Poems live in a folder on disk unless you say otherwise. **S3 is optional**: nothing to configure, and the AWS SDK isn't needed unless you use it.

### In code

```ts
import { fs, s3 } from "@cantoramann/tercet/storage";

storage: fs(),                                     // the contentDir from next.config (default content/poems)
storage: fs("/srv/poems"),                         // any other folder
storage: s3({ bucket: "my-poems", prefix: "published" }),
```

Set the folder once, with `withTercet({}, { contentDir })`. `fs()`, the default storage and the CLI all read it, and it's bundled into the server output for serverless hosts. `s3()` reads any option you leave out from the environment. Credentials always come from the AWS default chain (environment, profile or IAM role), never from code.

To use S3, install the SDK in your site: `bun add @aws-sdk/client-s3`. Without it, the build replaces the SDK with a stub, and choosing S3 fails with that install instruction.

### From the environment

With no `storage` in the config, `TERCET_STORAGE` picks a backend, so one build can use disk in development and a bucket in production.

| Driver | Use it for | Settings |
| --- | --- | --- |
| `fs` | the local machine, self-hosting, git-tracked content | the `contentDir` (or `TERCET_FS_DIR`) |
| `s3` | AWS S3 and S3-compatible services (R2, MinIO, ...) | `TERCET_S3_BUCKET`, `TERCET_S3_REGION`, `TERCET_S3_PREFIX`, `TERCET_S3_ENDPOINT`, `TERCET_S3_FORCE_PATH_STYLE` |

When `TERCET_STORAGE` is unset, the site uses `s3` if `TERCET_S3_BUCKET` is set and `fs` otherwise. The S3 region defaults to the AWS SDK's own lookup (`AWS_REGION`, your profile).

### Import and export

The package installs a `tercet` command (Node 22.18+ or Bun). Run it from your site's folder: it reads `.env.local` and `.env`, and uses the `contentDir` from `next.config` as the default folder.

```bash
tercet list                                   # the site's own storage
tercet list ./drafts                          # any folder
tercet copy s3://my-poems/published ./backup  # bucket → disk
tercet copy ./content/poems s3 --dry-run      # disk → the bucket configured in env
```

A location is a folder (`./poems`, `/srv/poems`, `fs:poems`), an S3 URL (`s3://bucket/prefix`, region and endpoint from env), or a driver name (`fs`, `s3`) configured by env. Copies never overwrite unless you pass `--overwrite`, and every `.md`/`.mdx` file is parsed before it's written. Sites with a custom `codec` add `--all` to copy every file as-is.

### Adding a backend

A backend is a `BlobStore`: `list`, `read` and `write` over flat text keys ([`src/storage/types.ts`](src/storage/types.ts)).

- **Just for your site**: pass `storage: myStore` in the config.
- **For everyone**: create `src/storage/<name>/index.ts` exporting a `StorageDriver`, using [`fs`](src/storage/fs/index.ts) as the template, then add it to [`src/storage/registry.ts`](src/storage/registry.ts). A driver provides `optionsFromEnv` and `create`, and optionally `detect` (so it's picked automatically when its env settings are present) and `parseLocation` (its CLI syntax, like `s3://`). `TERCET_STORAGE` and the CLI pick it up with no other changes.

## Publishing from the browser

`/write` is a distraction-free editor. Drafts autosave in the browser, and ⌘/Ctrl + S downloads the poem as an `.mdx` file in the default frontmatter format. Publishing writes through the site's configured codec.

To publish straight to storage, set `TERCET_WRITE_TOKEN` (32+ characters, e.g. `openssl rand -hex 32`). A publish button then appears and asks for the token. Scripts can use the API:

```bash
curl -X POST https://example.com/api/poems \
  -H "Authorization: Bearer $TERCET_WRITE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Title", "content": "line one\n\nline two"}'
```

Without the token, `POST /api/poems` returns 404 and the site is read-only. On serverless hosts with a read-only disk (Vercel, for example), publish to `s3`. `GET /api/poems` returns every poem as JSON.

## Keyboard

| Key | Where | Does |
| --- | --- | --- |
| `/` | home | focus search |
| `Esc` | search | clear |
| `←` `→` | poem | previous / next poem |
| `⌘/Ctrl + S` | writer | download the poem |

## Security

- **Headers** ([`next/index.mjs`](next/index.mjs)): CSP with `object-src 'none'`, `base-uri 'none'` and `frame-ancestors 'none'`, plus host-only HSTS, `nosniff`, COOP/CORP and a deny-all Permissions-Policy. The file explains why `script-src` keeps `'unsafe-inline'` for prerendered pages.
- **No image optimizer**: `/_next/image` is disabled, which removes the attack surface behind the 2026 Next.js image RCEs.
- **Content is data**: frontmatter is parsed by a small `key: value` reader (no YAML tags, no `---js` evaluation), and poems render as text nodes.
- **Storage keys**: one validator for all backends rejects separators, `..`, leading dots and control characters. The fs driver ignores symlinks and writes atomically; S3 uses conditional writes. Slugs are always generated on the server.
- **Fail closed**: a storage error keeps serving the last good pages instead of caching an empty or partial site.
- **Publishing**: off unless a strong token is configured; constant-time comparison, body size limits, input normalization (control and bidi-override characters removed), no overwriting.

## Layout

```
src/index.ts         createTercet, defineConfig, public types
src/config.ts        config contract and defaults
src/data.ts          repository + Next.js caching
src/pages/           page factories (layout, home, poem, write, not found, sitemap, robots)
src/api/             route handler factories
src/ui/              components, grouped by feature; client config via context
src/storage/         BlobStore contract, key validation, one folder per driver, fs()/s3() helpers, locations
src/poems/           domain: types, codecs, repository, validation, text helpers
src/search/          accent-insensitive search with highlight spans
src/i18n/            message types, plural/format helpers, built-in dictionaries
src/theme/           palette types, defaults, validation, CSS output
src/security/        token checks
next/                withTercet and security headers (plain JS, for next.config)
bin/tercet.ts        import/export CLI
tests/               bun test
```

The package ships compiled ES modules with type declarations; `"use client"` boundaries are kept per file. The `tercet` CLI runs on Node 22.18+ or Bun.
