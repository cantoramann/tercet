import type { NextConfig } from "next";

export interface TercetNextOptions {
  /**
   * The content folder, set once: `fs()`, the default fs driver and the
   * `tercet` CLI all read it, and it is bundled into the server output.
   * Default: TERCET_FS_DIR at build time, else `content/poems`.
   */
  contentDir?: string;
  /**
   * Extra CSP sources, merged into the defaults. For example, an analytics
   * script: `{ "script-src": ["https://plausible.io"], "connect-src": ["https://plausible.io"] }`.
   */
  csp?: Record<string, string[]>;
  /**
   * Strict-Transport-Security. Default: `max-age=63072000` (two years, this
   * host only). `includeSubDomains` and `preload` cover the whole domain and
   * are hard to undo, so turn them on deliberately. `false` omits the header.
   */
  hsts?: { includeSubDomains?: boolean; preload?: boolean } | false;
}

export function withTercet(nextConfig?: NextConfig, options?: TercetNextOptions): NextConfig;

export function securityHeaders(options: {
  dev: boolean;
  csp?: Record<string, string[]>;
  hsts?: TercetHsts;
}): { key: string; value: string }[];

type TercetHsts = { includeSubDomains?: boolean; preload?: boolean } | false;
