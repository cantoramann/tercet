import { expect, test } from "bun:test";
import { createSearchIndex, fold } from "../src/search/index.js";

const docs = [
  { slug: "garden", title: "Çocuk Bahçesi", content: "Bir ağaç\nRüzgârda ıslık çalar" },
  { slug: "morning", title: "Çiçekli Sabah", content: "Duman\nÇocuk gibi" },
  { slug: "bos", title: "Boş", content: "hiç" },
];

test("folds case and diacritics, including dotless and dotted i", () => {
  expect(fold("IŞIK İpek Çağ")).toBe("isik ipek cag");
});

test("empty query browses every poem with a first-line excerpt", () => {
  const hits = createSearchIndex(docs).search("  ");
  expect(hits.map((h) => h.doc.slug)).toEqual(["garden", "morning", "bos"]);
  expect(hits[0].excerpt.text).toBe("Bir ağaç");
});

test("matches without accents, title hits first, with highlight spans", () => {
  const hits = createSearchIndex(docs).search("cocuk");
  expect(hits.map((h) => h.doc.slug)).toEqual(["garden", "morning"]);
  const [start, end] = hits[0].title.marks[0];
  expect(hits[0].title.text.slice(start, end)).toBe("Çocuk");
  const [s2, e2] = hits[1].excerpt.marks[0];
  expect(hits[1].excerpt.text.slice(s2, e2)).toBe("Çocuk");
});

test("all tokens must match", () => {
  const index = createSearchIndex(docs);
  expect(index.search("islik ruzgar").map((h) => h.doc.slug)).toEqual(["garden"]);
  expect(index.search("islik duman")).toEqual([]);
});

test("long lines are windowed around the match", () => {
  const long = `${"önce ".repeat(30)}hedef${" sonra".repeat(30)}`;
  const [hit] = createSearchIndex([{ slug: "l", title: "L", content: long }]).search("hedef");
  expect(hit.excerpt.text.startsWith("…")).toBe(true);
  const [s, e] = hit.excerpt.marks[0];
  expect(hit.excerpt.text.slice(s, e)).toBe("hedef");
});

test("matches ending inside a multi-character fold still highlight the character", () => {
  const [hit] = createSearchIndex([{ slug: "f", title: "ﬁle Straße", content: "x" }]).search("f stras");
  const text = hit.title.text;
  expect(hit.title.marks.map(([s, e]) => text.slice(s, e))).toEqual(["ﬁ", "Stra"]);
  const [ss] = createSearchIndex([{ slug: "s", title: "Straße", content: "x" }]).search("strass");
  expect(ss.title.marks.map(([s, e]) => ss.title.text.slice(s, e))).toEqual(["Straß"]);
});
