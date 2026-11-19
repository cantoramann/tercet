import { defaultContentDir } from "./content-dir.js";
import { fsDriver } from "./fs/index.js";
import { resolveS3Options, s3Driver, type S3Options } from "./s3/index.js";
import type { BlobStore } from "./types.js";

/** Poems in a folder on disk. With no argument, the folder given to `withTercet` (default `content/poems`). */
export function fs(dir: string = defaultContentDir()): BlobStore {
  return fsDriver.create({ dir });
}

/**
 * Poems in an S3 (or S3-compatible) bucket. Options left out are read from
 * the environment (TERCET_S3_BUCKET, TERCET_S3_REGION, ...). Credentials
 * always come from the AWS default chain, never from code.
 */
export function s3(options: Partial<S3Options> = {}): BlobStore {
  return s3Driver.create(resolveS3Options(process.env, options));
}
