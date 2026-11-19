import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { TercetConfig, ResolvedConfig } from "./config.js";
import { defaultCodec } from "./poems/codec/index.js";
import { createPoemRepository, type PoemRepository } from "./poems/repository.js";
import type { Poem } from "./poems/types.js";
import { createStoreFromEnv } from "./storage/index.js";

export const POEMS_TAG = "tercet:poems";

export interface PoemData {
  /** Uncached access, for writes and custom tooling. */
  repository(): PoemRepository;
  /** Every poem, cached across requests and deduplicated within one render. */
  listPoems(): Promise<Poem[]>;
  getPoemWithNeighbours(slug: string): Promise<{ poem: Poem; previous: Poem | null; next: Poem | null } | null>;
}

/** Next.js data layer: builds the repository lazily and adds caching on top. */
export function createData(config: TercetConfig, resolved: ResolvedConfig): PoemData {
  let repository: PoemRepository | undefined;
  const getRepository = () =>
    (repository ??= createPoemRepository({
      store: config.storage ?? createStoreFromEnv(process.env),
      codec: config.codec ?? defaultCodec,
      locale: resolved.locale,
    }));

  const listCached = unstable_cache(() => getRepository().list(), [POEMS_TAG], {
    revalidate: resolved.revalidate,
    tags: [POEMS_TAG],
  });
  const listPoems = cache((): Promise<Poem[]> => listCached());

  const getPoemWithNeighbours = cache(async (slug: string) => {
    const poems = await listPoems();
    const index = poems.findIndex((poem) => poem.slug === slug);
    if (index === -1) return null;
    return { poem: poems[index], previous: poems[index - 1] ?? null, next: poems[index + 1] ?? null };
  });

  return { repository: getRepository, listPoems, getPoemWithNeighbours };
}
