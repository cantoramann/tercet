import type { TercetConfig, ResolvedConfig } from "../config.js";
import type { PoemData } from "../data.js";

/** Shared by every page factory: the site's config and its data layer. */
export interface Context {
  config: TercetConfig;
  site: ResolvedConfig;
  data: PoemData;
}
