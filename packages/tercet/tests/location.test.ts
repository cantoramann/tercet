import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fs, s3, storeFromLocation, StorageConfigError } from "../src/storage/index.js";

const dirs: string[] = [];
afterAll(() => Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true }))));

test("folder paths and fs: open the fs driver", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "tercet-loc-"));
  dirs.push(dir);
  const store = storeFromLocation(dir, {});
  await store.write("a.md", "x");
  expect(await storeFromLocation(`fs:${dir}`, {}).read("a.md")).toBe("x");
  expect(storeFromLocation("./poems", {}).driver).toBe("fs");
});

test("s3:// URLs and driver names", () => {
  expect(storeFromLocation("s3://bucket/poems", {}).driver).toBe("s3");
  expect(storeFromLocation("fs", {}).driver).toBe("fs");
  expect(() => storeFromLocation("s3", {})).toThrow(StorageConfigError);
  expect(() => storeFromLocation("s3://bucket/../x", {})).toThrow();
  expect(() => storeFromLocation("nonsense", {})).toThrow(/Unknown location/);
});

test("helpers", () => {
  expect(fs("poems").driver).toBe("fs");
  expect(s3({ bucket: "b", prefix: "p" }).driver).toBe("s3");
  const saved = { ...process.env };
  delete process.env.TERCET_S3_BUCKET;
  expect(() => s3()).toThrow(/needs a bucket/);
  Object.assign(process.env, saved);
});
