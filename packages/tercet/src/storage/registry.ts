import { fsDriver } from "./fs/index.js";
import { s3Driver } from "./s3/index.js";
import { StorageConfigError, type BlobStore, type Env, type StorageDriver } from "./types.js";

/** Every available backend. Adding one is a new folder plus one line here. */
export const drivers = {
  fs: fsDriver,
  s3: s3Driver,
} satisfies Record<string, StorageDriver<unknown>>;

export type DriverName = keyof typeof drivers;

export function isDriverName(name: string): name is DriverName {
  return Object.hasOwn(drivers, name);
}

/** Used when `TERCET_STORAGE` is unset and no driver detects its settings in the environment. */
export const DEFAULT_DRIVER: DriverName = "fs";

/**
 * The driver named by `TERCET_STORAGE`; otherwise the first driver whose
 * settings are present (e.g. `s3` when TERCET_S3_BUCKET is set); otherwise `fs`.
 */
export function resolveDriverName(env: Env): DriverName {
  const name = env.TERCET_STORAGE?.trim().toLowerCase();
  if (name) {
    if (!isDriverName(name)) {
      throw new StorageConfigError(
        `Unknown TERCET_STORAGE "${name}". Available: ${Object.keys(drivers).join(", ")}.`,
      );
    }
    return name;
  }
  const detected = (Object.keys(drivers) as DriverName[]).find((key) => {
    const driver: StorageDriver<unknown> = drivers[key];
    return driver.detect?.(env);
  });
  return detected ?? DEFAULT_DRIVER;
}

export function createStore(name: DriverName, env: Env): BlobStore {
  const driver: StorageDriver<unknown> = drivers[name];
  return driver.create(driver.optionsFromEnv(env));
}

export function createStoreFromEnv(env: Env): BlobStore {
  return createStore(resolveDriverName(env), env);
}
