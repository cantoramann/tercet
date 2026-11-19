import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Revalidation needs a running Next.js server; record the calls instead.
const revalidated: string[] = [];
mock.module("next/cache", () => ({
  revalidatePath: (p: string) => revalidated.push(`path:${p}`),
  revalidateTag: (t: string) => revalidated.push(`tag:${t}`),
  unstable_cache: <T>(fn: T) => fn,
}));

const { createPoemsApi } = await import("../src/api/poems.js");
const { resolveConfig } = await import("../src/config.js");
const { createPoemRepository } = await import("../src/poems/repository.js");
const { defaultCodec } = await import("../src/poems/codec/index.js");
const { createFsStore } = await import("../src/storage/fs/index.js");

const TOKEN = "t".repeat(40);
let dir: string;
const dirs: string[] = [];
afterAll(() => Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))));

function api() {
  const repo = createPoemRepository({ store: createFsStore({ dir }), codec: defaultCodec, locale: "en" });
  const site = resolveConfig({ title: "Test" });
  const data = { repository: () => repo, listPoems: () => repo.list(), getPoemWithNeighbours: async () => null };
  return createPoemsApi({ config: { title: "Test" }, site, data });
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/poems", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}`, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "tercet-api-"));
  dirs.push(dir);
  revalidated.length = 0;
  process.env.TERCET_WRITE_TOKEN = TOKEN;
});

describe("POST /api/poems", () => {
  test("404 when publishing is off", async () => {
    delete process.env.TERCET_WRITE_TOKEN;
    expect((await api().POST(post({ title: "a", content: "b" }))).status).toBe(404);
  });

  test("401 without or with a wrong token", async () => {
    const res = await api().POST(post({ title: "a", content: "b" }, { authorization: "" }));
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Bearer");
    expect((await api().POST(post({ title: "a", content: "b" }, { authorization: `Bearer ${"x".repeat(40)}` }))).status).toBe(401);
  });

  test("415 for non-JSON, 400 for bad JSON or fields", async () => {
    expect((await api().POST(post("x", { "content-type": "text/plain" }))).status).toBe(415);
    expect((await api().POST(post("{not json"))).status).toBe(400);
    expect((await api().POST(post({ title: " ", content: "b" }))).status).toBe(400);
  });

  test("413 when the body is too large, even with a lying Content-Length", async () => {
    const big = JSON.stringify({ title: "a", content: "x".repeat(300_000) });
    expect((await api().POST(post(big))).status).toBe(413);
    expect((await api().POST(post(big, { "content-length": "10" }))).status).toBe(413);
  });

  test("201 creates the poem with a server-made slug, then 409 on repeat", async () => {
    const res = await api().POST(post({ title: "../../First Snow!", content: "one\n\ntwo" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ slug: "first-snow" });
    expect(res.headers.get("location")).toBe("/poems/first-snow");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await readFile(path.join(dir, "first-snow.mdx"), "utf8")).toContain('title: "../../First Snow!"');
    expect(revalidated).toContain("path:/poems/first-snow");
    expect((await api().POST(post({ title: "First snow", content: "again" }))).status).toBe(409);
  });
});

test("GET returns every poem with a CDN cache header", async () => {
  await api().POST(post({ title: "A", content: "b" }));
  const res = await api().GET();
  expect((await res.json()).map((p: { slug: string }) => p.slug)).toEqual(["a"]);
  expect(res.headers.get("cache-control")).toContain("s-maxage=600");
});
