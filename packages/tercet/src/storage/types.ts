/**
 * Storage contract.
 *
 * A store is a flat namespace of UTF-8 text blobs addressed by key
 * (e.g. `first-snow.md`). It knows nothing about poems; the poem layer maps
 * keys to slugs and blobs to poems through a codec. That separation lets any
 * backend (disk, S3, R2, a database, ...) be dropped in by implementing three
 * methods.
 *
 * To add a backend:
 *   1. create `src/storage/<name>/index.ts` exporting a `StorageDriver`
 *   2. register it in `src/storage/registry.ts`
 */

export interface WriteOptions {
  /** Replace an existing blob. Defaults to `false`: writing to an existing key throws `BlobExistsError`. */
  overwrite?: boolean;
}

export interface BlobStore {
  /** Driver name, for logs and diagnostics. */
  readonly driver: string;
  /** Every key in the store. Order is not guaranteed. */
  list(): Promise<string[]>;
  /** The blob's text, or `null` when the key does not exist. */
  read(key: string): Promise<string | null>;
  /** Create (or with `overwrite`, replace) a blob. */
  write(key: string, body: string, options?: WriteOptions): Promise<void>;
}

/** Environment as a plain record, so drivers stay testable without `process`. */
export type Env = Readonly<Record<string, string | undefined>>;

/**
 * A storage backend. `fromEnv` reads and validates its own settings, so each
 * driver owns its configuration and nothing else needs to know about it.
 */
export interface StorageDriver<Options = unknown> {
  readonly name: string;
  /** Read this driver's settings from the environment. Throws `StorageConfigError` when required ones are missing. */
  optionsFromEnv(env: Env): Options;
  create(options: Options): BlobStore;
  /** True when the environment configures this driver. Picks it when `TERCET_STORAGE` is unset. */
  detect?(env: Env): boolean;
  /** Options for a location string this driver understands (`s3://bucket`, `./poems`), or `null`. Used by the CLI. */
  parseLocation?(location: string, env: Env): Options | null;
}

export class BlobExistsError extends Error {
  constructor(readonly key: string) {
    super(`Blob already exists: ${key}`);
    this.name = "BlobExistsError";
  }
}

export class InvalidKeyError extends Error {
  constructor(readonly key: string) {
    super(`Invalid storage key: ${JSON.stringify(key)}`);
    this.name = "InvalidKeyError";
  }
}

export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigError";
  }
}
