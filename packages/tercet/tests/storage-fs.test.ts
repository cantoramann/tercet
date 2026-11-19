import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createFsStore } from "../src/storage/fs/index.js";
import { BlobExistsError, InvalidKeyError, createStoreFromEnv, resolveDriverName } from "../src/storage/index.js";

let dir: string;
let outside: string;

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "tercet-fs-"));
  outside = await mkdtemp(path.join(tmpdir(), "tercet-outside-"));
  await writeFile(path.join(outside, "secret.mdx"), "secret");
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
});

describe("fs store", () => {
  test("write, read, list", async () => {
    const store = createFsStore({ dir });
    await store.write("a.mdx", "bir");
    expect(await store.read("a.mdx")).toBe("bir");
    expect(await store.read("missing.mdx")).toBeNull();
    expect(await store.list()).toContain("a.mdx");
  });

  test("refuses to overwrite unless asked", async () => {
    const store = createFsStore({ dir });
    await store.write("b.mdx", "1");
    expect(store.write("b.mdx", "2")).rejects.toBeInstanceOf(BlobExistsError);
    await store.write("b.mdx", "3", { overwrite: true });
    expect(await store.read("b.mdx")).toBe("3");
    expect((await store.list()).some((k) => k.endsWith(".tmp"))).toBe(false);
  });

  test("rejects traversal and odd keys", async () => {
    const store = createFsStore({ dir });
    for (const key of ["../x.mdx", "a/b.mdx", "..", ".hidden", "a\u0000.mdx", "C:\\x", ""]) {
      expect(store.read(key)).rejects.toBeInstanceOf(InvalidKeyError);
      expect(store.write(key, "x")).rejects.toBeInstanceOf(InvalidKeyError);
    }
  });

  test("does not follow symlinks out of the root", async () => {
    await symlink(path.join(outside, "secret.mdx"), path.join(dir, "link.mdx"));
    const store = createFsStore({ dir });
    expect(await store.list()).not.toContain("link.mdx");
    expect(await store.read("link.mdx")).toBeNull();
  });

  test("a missing directory is an error, never an empty site", async () => {
    expect(createFsStore({ dir: path.join(dir, "nope") }).list()).rejects.toThrow();
  });

  test("a failed exclusive write leaves no file behind", async () => {
    const store = createFsStore({ dir });
    await store.write("c.mdx", "ilk");
    expect(store.write("c.mdx", "ikinci")).rejects.toBeInstanceOf(BlobExistsError);
    expect(await store.read("c.mdx")).toBe("ilk");
    const { readdir } = await import("node:fs/promises");
    expect((await readdir(dir)).some((f) => f.endsWith(".tmp"))).toBe(false);
  });
});

describe("driver selection", () => {
  test("explicit, inferred and invalid", () => {
    expect(resolveDriverName({ TERCET_STORAGE: "FS" })).toBe("fs");
    expect(resolveDriverName({ TERCET_S3_BUCKET: "b" })).toBe("s3");
    expect(resolveDriverName({})).toBe("fs");
    expect(() => resolveDriverName({ TERCET_STORAGE: "__proto__" })).toThrow();
    expect(() => createStoreFromEnv({ TERCET_STORAGE: "s3" })).toThrow(/bucket|BUCKET/);
  });

  test("s3 prefix is validated", () => {
    expect(() => createStoreFromEnv({ TERCET_STORAGE: "s3", TERCET_S3_BUCKET: "b", TERCET_S3_PREFIX: "../x" })).toThrow();
    expect(createStoreFromEnv({ TERCET_STORAGE: "s3", TERCET_S3_BUCKET: "b", TERCET_S3_PREFIX: "/poems/" }).driver).toBe("s3");
  });
});
