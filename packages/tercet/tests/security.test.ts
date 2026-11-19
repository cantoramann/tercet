import { expect, test } from "bun:test";
import { parseDraft } from "../src/poems/validate.js";
import { bearerToken, configuredToken, tokensMatch } from "../src/security/token.js";

const strong = "x".repeat(40);

test("publishing is off without a strong token", () => {
  expect(configuredToken({})).toBeNull();
  expect(configuredToken({ TERCET_WRITE_TOKEN: "short" })).toBeNull();
  expect(configuredToken({ TERCET_WRITE_TOKEN: ` ${strong} ` })).toBe(strong);
});

test("token comparison", () => {
  expect(tokensMatch(strong, strong)).toBe(true);
  expect(tokensMatch(strong.slice(1), strong)).toBe(false);
  expect(tokensMatch("", strong)).toBe(false);
});

test("bearer parsing", () => {
  expect(bearerToken("Bearer abc")).toBe("abc");
  expect(bearerToken("bearer   abc ")).toBe("abc");
  expect(bearerToken("Basic abc")).toBeNull();
  expect(bearerToken("Bearer a b")).toBeNull();
  expect(bearerToken(null)).toBeNull();
});

test("drafts are validated and cleaned", () => {
  expect(parseDraft(null)).toEqual({ ok: false, error: "invalid" });
  expect(parseDraft({ title: 1, content: "x" })).toEqual({ ok: false, error: "invalid" });
  expect(parseDraft({ title: " ", content: "x" })).toEqual({ ok: false, error: "empty" });
  expect(parseDraft({ title: "t", content: "x".repeat(50_001) })).toEqual({ ok: false, error: "too_long" });

  const result = parseDraft({ title: "  Bir\u202E  Başlık\u0007 ", content: "dize  \r\nikinci\u0000" }, new Date("2026-03-04"));
  expect(result).toEqual({ ok: true, draft: { title: "Bir Başlık", content: "dize\nikinci", date: "2026-03-04" } });
});
