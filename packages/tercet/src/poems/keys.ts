import type { PoemCodec } from "./types.js";

/** The slug for a storage key the codec can read (`first-snow.md` → `first-snow`), or `null`. Case-insensitive. */
export function slugOf(codec: PoemCodec, key: string): string | null {
  const lower = key.toLowerCase();
  const ext = codec.extensions.find((e) => lower.endsWith(e.toLowerCase()));
  return ext ? key.slice(0, -ext.length) : null;
}
