import { createStore, drivers, isDriverName, type DriverName } from "./registry.js";
import { StorageConfigError, type BlobStore, type Env, type StorageDriver } from "./types.js";

/**
 * Open a store from a location string, as used by the CLI. Each driver
 * declares the syntax it understands (`parseLocation`):
 *
 *   ./poems, /srv/poems, fs:poems   fs
 *   s3://bucket/optional/prefix     s3 (region, endpoint from env)
 *
 * A bare driver name (`fs`, `s3`) opens that driver configured by env.
 */
export function storeFromLocation(location: string, env: Env): BlobStore {
  const value = location.trim();
  if (!value) throw new StorageConfigError("Empty storage location.");
  if (isDriverName(value)) return createStore(value, env);

  for (const key of Object.keys(drivers) as DriverName[]) {
    const driver: StorageDriver<unknown> = drivers[key];
    const options = driver.parseLocation?.(value, env);
    if (options) return driver.create(options);
  }

  throw new StorageConfigError(
    `Unknown location "${value}". Use a folder path (./poems), s3://bucket/prefix, or a driver (${Object.keys(drivers).join(", ")}).`,
  );
}
