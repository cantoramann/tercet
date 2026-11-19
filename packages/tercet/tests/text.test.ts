import { expect, test } from "bun:test";
import { countLines, countWords, toStanzas, truncate } from "../src/poems/text.js";

test("stanzas split on blank lines, including whitespace-only ones", () => {
  expect(toStanzas("a\n b \n\n  \nc\r\n\r\nd")).toEqual([["a", "b"], ["c"], ["d"]]);
});

test("counts", () => {
  expect(countWords("Bir ağaç, rüzgâr'da\nçalar")).toBe(4);
  expect(countLines("a\n\nb\n")).toBe(2);
});

test("truncate cuts on a word boundary", () => {
  expect(truncate("kısa", 10)).toBe("kısa");
  expect(truncate("bir iki üç dört beş", 12)).toBe("bir iki üç…");
});
