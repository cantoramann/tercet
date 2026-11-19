import { createPoemsApi } from "./api/poems.js";
import { resolveConfig, type TercetConfig } from "./config.js";
import { createData } from "./data.js";
import { createHomePage } from "./pages/home.js";
import { createLayout } from "./pages/layout.js";
import { createRobots, createSitemap } from "./pages/meta-routes.js";
import { createNotFoundPage } from "./pages/not-found.js";
import { createPoemPage } from "./pages/poem.js";
import type { Context } from "./pages/types.js";
import { createWritePage } from "./pages/write.js";

/**
 * Build a poetry site from a config. The result holds everything a Next.js
 * `app/` directory needs; each route file re-exports one piece:
 *
 *   // app/page.tsx
 *   import { tercet } from "@/tercet";
 *   export const revalidate = 600;
 *   export default tercet.home.Page;
 *
 * Server-only: import it from route files, never from client components.
 */
export function createTercet(config: TercetConfig) {
  const site = resolveConfig(config);
  const context: Context = { config, site, data: createData(config, site) };

  return {
    /** The resolved config (defaults applied, messages merged). */
    site,
    /** Data access for custom pages: cached `listPoems`, uncached `repository()`. */
    data: context.data,
    layout: createLayout(context),
    home: { Page: createHomePage(context) },
    poem: createPoemPage(context),
    write: createWritePage(context),
    notFound: { Page: createNotFoundPage(context) },
    sitemap: createSitemap(context),
    robots: createRobots(context),
    api: { poems: createPoemsApi(context) },
  };
}

export type Tercet = ReturnType<typeof createTercet>;

export { defineConfig, type TercetConfig, type ResolvedConfig } from "./config.js";
export type { DeepPartial, Messages, Plural } from "./i18n/index.js";
export type { Palette, ThemeConfig } from "./theme/index.js";
export type { Poem, PoemCodec, PoemDraft } from "./poems/types.js";
export { frontmatterCodec } from "./poems/codec/frontmatter/index.js";
export { createPoemRepository, type PoemRepository } from "./poems/repository.js";
export {
  BlobExistsError,
  InvalidKeyError,
  StorageConfigError,
  createStore,
  createStoreFromEnv,
  drivers,
  fs,
  s3,
  isValidKey,
  type BlobStore,
  type StorageDriver,
  type WriteOptions,
} from "./storage/index.js";
