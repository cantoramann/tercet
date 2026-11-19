import { en } from "./locales/en.js";
import { tr } from "./locales/tr.js";
import type { Messages } from "./types.js";

export type { DeepPartial, Messages, Plural } from "./types.js";
export { format, mergeMessages, plural } from "./format.js";

/** Built-in dictionaries. A site can use any other language by passing full `messages` in its config. */
export const locales: Record<string, Messages> = { tr, en };
