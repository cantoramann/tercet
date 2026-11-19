import type { PoemCodec } from "../types.js";
import { frontmatterCodec } from "./frontmatter/index.js";

/** Used when a site sets no `codec`. Other formats implement `PoemCodec` in their own folder here. */
export const defaultCodec: PoemCodec = frontmatterCodec;
