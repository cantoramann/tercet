import { constants } from "node:fs";
import { link, mkdir, open, readdir, rename, rm } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { defaultContentDir } from "../content-dir.js";
import { assertValidKey, isValidKey } from "../keys.js";
import { BlobExistsError, type BlobStore, type StorageDriver } from "../types.js";

export interface FsOptions {
  /** Directory holding the blobs. Relative paths resolve from the working directory. */
  dir: string;
}

export function createFsStore({ dir }: FsOptions): BlobStore {
  const root = path.resolve(dir);

  const resolve = (key: string) => {
    const file = path.join(root, assertValidKey(key));
    // Belt and braces: the key check already forbids separators.
    if (path.dirname(file) !== root) throw new Error("Path escapes storage root");
    return file;
  };

  return {
    driver: "fs",

    async list() {
      // A missing directory is an error, not an empty collection: an empty
      // result would be cached and served as a site with no poems.
      const entries = await readdir(root, { withFileTypes: true });
      // Regular files only. Symlinks are skipped so a link cannot pull in files from outside the root.
      return entries.filter((e) => e.isFile() && isValidKey(e.name)).map((e) => e.name);
    },

    async read(key) {
      // O_NOFOLLOW: a symlink in the folder is treated as missing, never followed outside the root.
      const handle = await open(resolve(key), constants.O_RDONLY | constants.O_NOFOLLOW).catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code === "ENOENT" || error.code === "ELOOP") return null;
          throw error;
        },
      );
      if (!handle) return null;
      try {
        return await handle.readFile("utf8");
      } finally {
        await handle.close();
      }
    },

    async write(key, body, { overwrite = false } = {}) {
      const file = resolve(key);
      await mkdir(root, { recursive: true });

      // Write the whole body to a temp file first, so readers never see a partial poem.
      const temp = path.join(root, `.${key}.${randomBytes(6).toString("hex")}.tmp`);
      try {
        const handle = await open(temp, "wx", 0o644);
        try {
          await handle.writeFile(body, "utf8");
          await handle.sync();
        } finally {
          await handle.close();
        }
        if (overwrite) {
          await rename(temp, file);
        } else {
          // link() fails atomically if the target exists: no check-then-write race.
          await link(temp, file).catch((error: NodeJS.ErrnoException) => {
            if (error.code === "EEXIST") throw new BlobExistsError(key);
            throw error;
          });
        }
      } finally {
        await rm(temp, { force: true });
      }
    },
  };
}

export const fsDriver: StorageDriver<FsOptions> = {
  name: "fs",
  optionsFromEnv: (env) => ({ dir: env.TERCET_FS_DIR || defaultContentDir() }),
  create: createFsStore,
  // `fs:poems`, or anything that looks like a path: ./poems, ../x, /srv/poems, ~/poems, a/b, C:\poems
  parseLocation(location) {
    if (location.startsWith("fs:")) return { dir: location.slice(3) || "." };
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(location)) return null; // a URL belongs to another driver
    return /^[.~/]|[/\\]/.test(location) ? { dir: location } : null;
  },
};
