import { BlobExistsError, isValidKey, type BlobStore, type WriteOptions } from "../storage/index.js";
import { mapLimit } from "../util/concurrency.js";
import { slugOf } from "./keys.js";
import { slugify } from "./slug.js";
import type { Poem, PoemCodec, PoemDraft } from "./types.js";

export interface PoemRepository {
  /** All poems, sorted by title in the given locale. */
  list(): Promise<Poem[]>;
  get(slug: string): Promise<Poem | null>;
  /** Store a new poem; its slug comes from the title. */
  create(draft: PoemDraft, options?: WriteOptions): Promise<Poem>;
}

export interface RepositoryOptions {
  store: BlobStore;
  codec: PoemCodec;
  locale: string;
  /** Parallel reads against the store. Keeps remote backends from being flooded. */
  concurrency?: number;
}

/** Storage- and format-agnostic poem access. Has no Next.js dependency, so the CLI and tests share it. */
export function createPoemRepository({
  store,
  codec,
  locale,
  concurrency = 8,
}: RepositoryOptions): PoemRepository {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });


  return {
    async list() {
      const keys = await store.list();
      const entries = keys.flatMap((key) => {
        const slug = slugOf(codec, key);
        return slug ? [{ key, slug }] : [];
      });

      // A failed read rejects the whole list on purpose. A partial list would
      // be cached as if those poems were gone; throwing keeps the last good copy.
      const poems = await mapLimit(entries, concurrency, async ({ key, slug }) => {
        const raw = await store.read(key);
        return raw === null ? null : codec.decode(slug, raw);
      });

      // `first-snow.md` and `first-snow.mdx` would collide on one URL; the first one listed wins.
      const bySlug = new Map<string, Poem>();
      for (const poem of poems) if (poem && !bySlug.has(poem.slug)) bySlug.set(poem.slug, poem);
      return [...bySlug.values()].sort((a, b) => collator.compare(a.title, b.title));
    },

    async get(slug) {
      for (const ext of codec.extensions) {
        if (!isValidKey(slug + ext)) return null;
        const raw = await store.read(slug + ext);
        if (raw !== null) return codec.decode(slug, raw);
      }
      return null;
    },

    async create(draft, options) {
      const slug = slugify(draft.title) || `poem-${Date.now().toString(36)}`;
      const poem: Poem = { slug, title: draft.title, date: draft.date, content: draft.content };
      const key = slug + codec.extensions[0];
      // `foo.md` and `foo.mdx` share a URL, so any extension counts as taken.
      if (!options?.overwrite) {
        for (const ext of codec.extensions.slice(1)) {
          if ((await store.read(slug + ext)) !== null) throw new BlobExistsError(key);
        }
      }
      await store.write(key, codec.encode(poem), options);
      return poem;
    },
  };
}
