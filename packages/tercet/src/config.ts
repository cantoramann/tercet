import { locales, mergeMessages, type DeepPartial, type Messages } from "./i18n/index.js";
import type { PoemCodec } from "./poems/types.js";
import type { BlobStore } from "./storage/index.js";
import { resolveTheme, type ResolvedTheme, type ThemeConfig } from "./theme/index.js";

/** What a site provides. Everything except `title` has a default. */
export interface TercetConfig {
  title: string;
  description?: string;
  /** Lines shown under the title on the home page. */
  tagline?: readonly string[];
  /** BCP 47 language tag. Built-in dictionaries: `tr`, `en`. */
  locale?: string;
  /** Overrides on top of the built-in dictionary, or a full dictionary for another language. */
  messages?: DeepPartial<Messages>;
  /** Public origin, for canonical URLs, the sitemap and social cards. */
  siteUrl?: string;
  /**
   * Seconds the poem list is cached before storage is read again. Keep it equal
   * to `export const revalidate` in the site's route files.
   */
  revalidate?: number;
  /**
   * Where poems live. Defaults to the backend named by environment variables
   * (`TERCET_STORAGE`, `TERCET_S3_*`; see the README). Pass any `BlobStore` to use your own.
   */
  storage?: BlobStore;
  /** File format of stored poems. Defaults to Markdown with frontmatter. */
  codec?: PoemCodec;
  /** Colours for light and dark mode, and the fallback font. Unset values keep the defaults. */
  theme?: ThemeConfig;
}

export interface ResolvedConfig {
  title: string;
  description: string;
  tagline: readonly string[];
  locale: string;
  messages: Messages;
  siteUrl: string;
  revalidate: number;
  theme: ResolvedTheme;
}

/** Identity function that gives a site's config file type checking and autocompletion. */
export function defineConfig(config: TercetConfig): TercetConfig {
  return config;
}

export function resolveConfig(config: TercetConfig): ResolvedConfig {
  const locale = config.locale ?? "en";
  const base = locales[locale] ?? locales[locale.split("-")[0]] ?? locales.en;
  return {
    title: config.title,
    description: config.description ?? "",
    tagline: config.tagline ?? [],
    locale,
    messages: mergeMessages(base, config.messages),
    siteUrl: (config.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
    revalidate: config.revalidate ?? 600,
    theme: resolveTheme(config.theme),
  };
}

/** The part of the config the browser needs. Plain data only. */
export interface ClientConfig {
  title: string;
  locale: string;
  messages: Messages;
}
