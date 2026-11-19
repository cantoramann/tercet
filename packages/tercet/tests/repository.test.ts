import { expect, test } from "bun:test";
import { defaultCodec } from "../src/poems/codec/index.js";
import { createPoemRepository } from "../src/poems/repository.js";
import { BlobExistsError, type BlobStore } from "../src/storage/index.js";

function memoryStore(seed: Record<string, string> = {}): BlobStore {
  const blobs = new Map(Object.entries(seed));
  return {
    driver: "memory",
    list: async () => [...blobs.keys()],
    read: async (key) => {
      if (key === "broken.mdx") throw new Error("boom");
      return blobs.get(key) ?? null;
    },
    write: async (key, body, { overwrite = false } = {}) => {
      if (blobs.has(key) && !overwrite) throw new BlobExistsError(key);
      blobs.set(key, body);
    },
  };
}

const make = (seed?: Record<string, string>) =>
  createPoemRepository({ store: memoryStore(seed), codec: defaultCodec, locale: "tr" });

test("lists poems sorted by Turkish collation, skipping non-poems and duplicate slugs", async () => {
  const repo = make({
    "d.mdx": '---\ntitle: "Dere"\n---\nx',
    "c.mdx": '---\ntitle: "Çay"\n---\nx',
    "b.mdx": '---\ntitle: "Cam"\n---\nx',
    "d.md": '---\ntitle: "Duplicate"\n---\nx',
    "notes.txt": "not a poem",
  });
  expect((await repo.list()).map((p) => p.title)).toEqual(["Cam", "Çay", "Dere"]);
});

test("a failed read fails the whole list, so a partial list is never cached", async () => {
  const repo = make({ "a.mdx": "x", "broken.mdx": "y" });
  expect(repo.list()).rejects.toThrow("boom");
});

test("get returns null for unknown or unsafe slugs", async () => {
  const repo = make({ "a.mdx": "x" });
  expect((await repo.get("a"))?.content).toBe("x");
  expect(await repo.get("../a")).toBeNull();
  expect(await repo.get("zzz")).toBeNull();
});

test("create derives the slug from the title and refuses duplicates", async () => {
  const repo = make();
  const poem = await repo.create({ title: "Gün Batımı", content: "dize", date: "2026-01-01" });
  expect(poem.slug).toBe("gun-batimi");
  expect((await repo.get("gun-batimi"))?.title).toBe("Gün Batımı");
  expect(repo.create({ title: "Gün batımı!", content: "başka" })).rejects.toBeInstanceOf(BlobExistsError);
});

test("create treats another extension with the same slug as taken", async () => {
  const repo = make({ "foo.md": "eski" });
  expect(repo.create({ title: "Foo", content: "yeni" })).rejects.toBeInstanceOf(BlobExistsError);
});
